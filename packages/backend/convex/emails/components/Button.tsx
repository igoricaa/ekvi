import { Button as EmailButton } from "@react-email/components";

type ButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
};

export const Button = ({
  href,
  children,
  variant = "primary",
  className,
}: ButtonProps) => {
  const styles =
    variant === "primary"
      ? "bg-primary text-black"
      : "bg-transparent text-primary border border-primary";

  return (
    <EmailButton
      href={href}
      className={`${styles} px-8 py-4 rounded-md text-base font-semibold no-underline box-border inline-block ${className || ""}`}
    >
      {children}
    </EmailButton>
  );
};
