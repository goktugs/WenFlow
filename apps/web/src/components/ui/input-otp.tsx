import * as React from "react";
import { OTPInput, OTPInputContext, type OTPInputProps } from "input-otp";
import { Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput>
>(({ className, containerClassName, ...props }, ref) => (
  <OTPInput
    ref={ref}
    containerClassName={cn(
      "flex items-center gap-2 has-[:disabled]:opacity-50",
      containerClassName
    )}
    className={cn("disabled:cursor-not-allowed", className)}
    {...props}
  />
));

InputOTP.displayName = "InputOTP";

function InputOTPGroup({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn("flex items-center", className)} {...props} />;
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  index: number;
}) {
  const otpContext = React.useContext(OTPInputContext);
  const slot = otpContext.slots[index];

  return (
    <div
      className={cn(
        "relative flex h-10 w-9 items-center justify-center border-y border-r border-input text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
        slot?.isActive && "z-10 ring-2 ring-ring",
        slot?.char && "bg-muted/40",
        className
      )}
      {...props}
    >
      {slot?.char ?? slot?.placeholderChar}
      {slot?.hasFakeCaret ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-pulse bg-foreground duration-1000" />
        </div>
      ) : null}
    </div>
  );
}

function InputOTPSeparator({
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div role="separator" {...props}>
      <Minus />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
export type { OTPInputProps };
