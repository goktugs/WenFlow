import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type ShareJoinDialogProps = {
  open: boolean;
  isJoining: boolean;
  joinPassword: string;
  passwordSlots: number[];
  onOpenChange: (open: boolean) => void;
  onJoinPasswordChange: (value: string) => void;
  onSubmit: () => void;
};

export function ShareJoinDialog({
  open,
  isJoining,
  joinPassword,
  passwordSlots,
  onOpenChange,
  onJoinPasswordChange,
  onSubmit
}: ShareJoinDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isJoining}>
        <DialogHeader>
          <DialogTitle>Join Shared Document</DialogTitle>
          <DialogDescription>
            Enter the 4-digit collaboration password to open this shared document.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-2">
          <InputOTP
            maxLength={4}
            value={joinPassword}
            onChange={onJoinPasswordChange}
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              {passwordSlots.map((slotIndex) => (
                <InputOTPSlot key={slotIndex} index={slotIndex} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <DialogFooter>
          <Button disabled={isJoining} onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={isJoining || joinPassword.length !== 4}
            onClick={onSubmit}
          >
            {isJoining ? "Joining..." : "Join document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
