import { Fragment } from "react";
import { formatPoints } from "./points";

// A point total that may wrap only after a thousands comma, never inside a group of digits.
export function BreakablePoints({ value }: { value: number }) {
  const groups = formatPoints(value).split(",");
  return (
    <>
      {groups.map((group, i) => (
        <Fragment key={i}>
          {i < groups.length - 1 ? (
            <>
              {group},<wbr />
            </>
          ) : (
            group
          )}
        </Fragment>
      ))}
    </>
  );
}
