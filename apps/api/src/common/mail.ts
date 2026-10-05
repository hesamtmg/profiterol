import { createTransport, type SendMailOptions, type Transporter } from 'nodemailer';
import { config } from '../config';

/** SMTP_URL=log prints emails to the API log instead of sending them (handy in development). */
const transporter: Transporter | null =
  config.smtpUrl === 'log' ? createTransport({ jsonTransport: true }) : config.smtpUrl ? createTransport(config.smtpUrl) : null;

export const canSendMail = () => transporter !== null;

export async function sendMail(message: Omit<SendMailOptions, 'from'>) {
  if (!transporter) return false;
  const info = await transporter.sendMail({ from: config.smtpFrom, ...message });
  if (config.smtpUrl === 'log') console.log(`[mail] ${(info as { message?: string }).message ?? ''}`);
  return true;
}
