import { Heading, Link, Section, Text } from "@react-email/components";
import { Button } from "./Button";
import { Layout } from "./Layout";
import SupportSection from "./SupportSection";

const ResetPasswordEmailTemplate = ({
  resetUrl,
  // userEmail,
}: {
  resetUrl: string;
  // userEmail: string;
}) => {
  return (
    <Layout preview="Reset your EKVI password securely">
      {/* Main Content */}
      <Section className="mb-[32px]">
        <Heading className="text-[24px] font-bold text-white mb-[16px] m-0">
          Reset Your Password
        </Heading>

        <Text className="text-[16px] text-gray-300 mb-[16px] m-0 leading-[24px]">
          We received a request to reset the password for your EKVI account.
          Don't worry - it happens to the best of us!
        </Text>

        <Text className="text-[16px] text-gray-300 mb-[48px] m-0 leading-[24px]">
          To create a new password and regain access to your training programs,
          masterclasses, and mentorship opportunities, click the button below:
        </Text>

        <Section className="text-center my-8">
          <Button href={resetUrl}>Reset Password</Button>
        </Section>

        <Text className="text-[14px] text-gray-400 mb-[16px] m-0 leading-[20px]">
          If the button doesn't work, you can copy and paste this link into your
          browser:
        </Text>

        <Text className="text-[14px] text-primary mb-[24px] m-0 break-all">
          <Link href={resetUrl} className="text-primary underline">
            {resetUrl}
          </Link>
        </Text>

        <Text className="text-[14px] text-gray-400 m-0 leading-[20px]">
          This password reset link will expire in 1 hour for security purposes.
        </Text>
      </Section>

      {/* Security Notice */}
      <Section className="bg-gray-900 rounded-[8px] p-[24px] mb-[32px]">
        <Heading className="text-[18px] font-bold text-white mb-[16px] m-0">
          Security Notice
        </Heading>

        <Text className="text-[14px] text-gray-300 mb-[16px] m-0 leading-[20px]">
          If you didn't request this password reset, you can safely ignore this
          email. Your account remains secure and no changes will be made.
        </Text>

        <Text className="text-[14px] text-gray-300 mb-[16px] m-0 leading-[20px]">
          For your security, we recommend:
        </Text>

        <Text className="text-[14px] text-gray-300 mb-[8px] m-0 leading-[20px]">
          • Using a strong, unique password for your EKVI account
        </Text>
        <Text className="text-[14px] text-gray-300 mb-[8px] m-0 leading-[20px]">
          • Enabling two-factor authentication when available
        </Text>
        <Text className="text-[14px] text-gray-300 m-0 leading-[20px]">
          • Never sharing your login credentials with others
        </Text>
      </Section>

      <SupportSection />
    </Layout>
  );
};

ResetPasswordEmailTemplate.PreviewProps = {
  resetUrl: "https://ekvilibrijum.rs/reset-password?token=abc123xyz789",
  userEmail: "stanisavljevic.igor@proton.me",
};

export default ResetPasswordEmailTemplate;
