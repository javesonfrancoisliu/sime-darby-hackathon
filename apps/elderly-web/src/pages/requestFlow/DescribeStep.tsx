import { MAX_DESCRIPTION_LENGTH } from "@sdh/contracts";

import { Button } from "../../ui/Button";
import { TextField } from "../../ui/TextField";

interface DescribeStepProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

export function DescribeStep({ value, placeholder, onChange, onNext }: DescribeStepProps) {
  const tooLong = value.trim().length > MAX_DESCRIPTION_LENGTH;
  return (
    <>
      <TextField
        label="Tell us more (you can skip this)"
        value={value}
        onChange={onChange}
        multiline
        maxLength={MAX_DESCRIPTION_LENGTH}
        placeholder={placeholder}
        helper={`${value.length} of ${MAX_DESCRIPTION_LENGTH} characters`}
        error={
          tooLong
            ? `Please shorten this to ${MAX_DESCRIPTION_LENGTH} characters or fewer.`
            : undefined
        }
      />
      <div className="step-actions">
        <Button block onClick={onNext} disabled={tooLong}>
          Next
        </Button>
      </div>
    </>
  );
}
