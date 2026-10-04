import { isSafeUrl } from '@profiterol/blocks';
import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

/** Use with `@Validate(SafeUrl)`: relative paths, anchors, http(s), mailto and tel only. */
@ValidatorConstraint({ name: 'safeUrl' })
export class SafeUrl implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && isSafeUrl(value);
  }
  defaultMessage() {
    return 'must be a relative path or an http(s), mailto or tel link';
  }
}
