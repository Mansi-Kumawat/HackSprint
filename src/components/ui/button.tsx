import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-foreground shadow-[0_1px_2px_rgb(0_0_0/0.12)] hover:bg-accent-hover",
        secondary: "bg-muted text-foreground hover:bg-muted/70",
        outline: "border border-border-strong bg-card hover:bg-muted",
        ghost: "hover:bg-muted",
        destructive: "bg-danger/10 text-danger hover:bg-danger/20",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-7.5 rounded-md px-2.5 text-xs",
        lg: "h-10 px-5",
        icon: "size-9",
        iconSm: "size-7 rounded-md [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
