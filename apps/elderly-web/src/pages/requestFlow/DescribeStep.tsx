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
  return (
    <>
      <TextField
        label="Tell us more (you can skip this)"
        value={value}
        onChange={onChange}
        multiline
        maxLength={MAX_DESCRIPTION_LENGTH}
        placeholder={placeholder}
        helper={`${value.length} of ${MAX_DESCRIPTION_LENGTH} letters`}
      />
      <div className="step-actions">
        <Button block onClick={onNext}>
          Next
        </Button>
      </div>
    </>
  );
}
