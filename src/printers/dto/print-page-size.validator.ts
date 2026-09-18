import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CreatePrintJobDto } from './create-print-job.dto';

@ValidatorConstraint({ name: 'PrintPageSize', async: false })
export class PrintPageSizeConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments) {
    const dto = args.object as CreatePrintJobDto;
    const hasFormat = dto.format !== undefined;
    const hasWidth = dto.width !== undefined;
    const hasHeight = dto.height !== undefined;

    if (hasFormat && (hasWidth || hasHeight)) {
      return false;
    }
    if ((hasWidth || hasHeight) && !(hasWidth && hasHeight)) {
      return false;
    }
    return true;
  }

  defaultMessage() {
    return 'Provide either format (A4 or A5) or both width and height, not both';
  }
}
