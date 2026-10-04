import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { withDefaults } from '@profiterol/blocks';
import { createTransport, type Transporter } from 'nodemailer';
import { Repository } from 'typeorm';
import { config } from '../config';
import { PagesService } from '../pages/pages.service';
import { SettingsService } from '../settings/settings.controller';
import { FormSubmission, SubmittedField } from './form-submission.entity';

interface FormField {
  label: string;
  type: string;
  required: boolean;
  options: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+\d\s()\-۰-۹٠-٩]{5,25}$/;

/** Splits "a, b، c" into choices (Persian comma included). */
export function choices(options: string): string[] {
  return options
    .split(/[,،]/)
    .map((o) => o.trim())
    .filter(Boolean);
}

const messages = {
  en: {
    changed: 'The form has changed. Reload the page and try again.',
    check: 'Please check the form',
    text: 'must be text',
    required: 'is required',
    long: 'is too long',
    email: 'is not a valid email address',
    tel: 'is not a valid phone number',
    choice: 'is not one of the choices',
  },
  fa: {
    changed: 'فرم تغییر کرده است. صفحه را دوباره بارگذاری کنید.',
    check: 'لطفا فرم را بررسی کنید',
    text: 'باید متن باشد',
    required: 'را پر کنید',
    long: 'خیلی طولانی است',
    email: 'ایمیل معتبر نیست',
    tel: 'شماره تلفن معتبر نیست',
    choice: 'یکی از گزینه‌ها را انتخاب کنید',
  },
};

/** Checks the answers against the form's fields as published, returning label/value pairs. */
export function checkAnswers(fields: FormField[], values: unknown[], locale = 'en'): SubmittedField[] {
  const m = messages[locale as keyof typeof messages] ?? messages.en;
  if (values.length !== fields.length) throw new BadRequestException(m.changed);
  const errors: string[] = [];
  const data = fields.map((f, i) => {
    const raw = values[i];
    const value = typeof raw === 'string' ? raw.trim() : '';
    const max = f.type === 'textarea' ? 5000 : 300;
    if (typeof raw !== 'string' && raw !== null && raw !== undefined) errors.push(`${f.label}: ${m.text}`);
    else if (f.required && !value) errors.push(`${f.label}: ${m.required}`);
    else if (value.length > max) errors.push(`${f.label}: ${m.long}`);
    else if (value && f.type === 'email' && !EMAIL.test(value)) errors.push(`${f.label}: ${m.email}`);
    else if (value && f.type === 'tel' && !PHONE.test(value)) errors.push(`${f.label}: ${m.tel}`);
    else if (value && f.type === 'select' && !choices(f.options).includes(value)) errors.push(`${f.label}: ${m.choice}`);
    return { label: f.label || `Field ${i + 1}`, value };
  });
  if (errors.length) throw new BadRequestException({ message: m.check, errors });
  return data;
}

@Injectable()
export class FormsService {
  private readonly log = new Logger(FormsService.name);
  private readonly mailer: Transporter | null = config.smtpUrl ? createTransport(config.smtpUrl) : null;

  constructor(
    @InjectRepository(FormSubmission) private readonly submissions: Repository<FormSubmission>,
    private readonly pages: PagesService,
    private readonly settings: SettingsService,
  ) {}

  async submit(pageId: string, blockId: string, locale: string, values: unknown[]) {
    const block = await this.pages.findPublishedBlock(pageId, locale, blockId);
    if (!block || block.type !== 'contact-form') throw new NotFoundException('Form not found');
    const props = withDefaults(block) as { title: string; fields: FormField[]; successMessage: string };
    const data = checkAnswers(props.fields ?? [], values, locale);

    const page = await this.pages.get(pageId);
    const pageTitle = page.translations.find((t) => t.locale === locale)?.title ?? page.name;
    const saved = await this.submissions.save(
      this.submissions.create({ pageId, pageTitle, blockId, formTitle: props.title ?? '', locale, data }),
    );
    this.notify(saved).catch((err) => this.log.warn(`Could not email form message: ${err}`));
    return { ok: true, message: props.successMessage };
  }

  private async notify(s: FormSubmission) {
    const to = (await this.settings.get()).notifyEmail;
    if (!this.mailer || !to) return;
    const replyTo = s.data.find((d) => EMAIL.test(d.value))?.value;
    await this.mailer.sendMail({
      from: config.smtpFrom,
      to,
      replyTo,
      subject: `New message: ${s.formTitle || 'Contact form'} (${s.pageTitle})`,
      text: `${s.data.map((d) => `${d.label}:\n${d.value}`).join('\n\n')}\n\n— Sent from the ${s.locale} page “${s.pageTitle}”`,
    });
  }

  list() {
    return this.submissions.find({ order: { createdAt: 'DESC' }, take: 500 });
  }

  unreadCount() {
    return this.submissions.countBy({ read: false });
  }

  async setRead(id: string, read: boolean) {
    const s = await this.submissions.findOneBy({ id });
    if (!s) throw new NotFoundException();
    s.read = read;
    return this.submissions.save(s);
  }

  async remove(id: string) {
    const s = await this.submissions.findOneBy({ id });
    if (!s) throw new NotFoundException();
    await this.submissions.remove(s);
  }
}
