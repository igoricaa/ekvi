import { Heading, Link, Section, Text } from "@react-email/components";
import { Button } from "./Button";
import { Layout } from "./Layout";
import SupportSection from "./SupportSection";

const MagicLinkTemplate = ({
  magicLinkUrl,
  // userEmail,
}: {
  magicLinkUrl: string;
  // userEmail: string;
}) => {
  return (
    <Layout preview="Sign in to EKVI - Your secure login link">
      {/* Main Content */}
      <Section className="mb-[32px]">
        <Heading className="text-[24px] font-bold text-white mb-[16px] m-0">
          Sign in to EKVI
        </Heading>

        <Text className="text-[16px] text-gray-300 mb-[16px] m-0 leading-[24px]">
          Hello! We received a request to sign in to your EKVI account. No
          password needed - we've got you covered with secure, passwordless
          authentication.
        </Text>

        <Text className="text-[16px] text-gray-300 mb-[48px] m-0 leading-[24px]">
          Click below to sign in to your account and continue your movement
          journey:
        </Text>

        <Section className="text-center my-8">
          <Button href={magicLinkUrl}>Sign In</Button>
        </Section>

        <Text className="text-[14px] text-gray-400 mb-[16px] m-0 leading-[20px]">
          If the button doesn't work, you can copy and paste this link into your
          browser:
        </Text>

        <Text className="text-[14px] text-primary mb-[24px] m-0 break-all">
          <Link href={magicLinkUrl} className="text-primary underline">
            {magicLinkUrl}
          </Link>
        </Text>
      </Section>

      {/* Important Notice */}
      <Section className="bg-gray-900 rounded-[8px] p-[24px] mb-[32px]">
        <Heading className="text-[18px] font-bold text-white mb-[16px] m-0">
          Important Notice
        </Heading>

        <Text className="text-[14px] text-gray-300 mb-[16px] m-0 leading-[20px]">
          <strong className="text-white">Expires in 15 minutes:</strong> This
          magic link will expire in 15 minutes for your security. If it expires,
          simply request a new one from the sign-in page.
        </Text>

        <Text className="text-[14px] text-gray-300 mb-[16px] m-0 leading-[20px]">
          <strong className="text-white">One-time use only:</strong> This link
          can only be used once. After clicking it, you'll be automatically
          signed in and the link will become invalid.
        </Text>

        <Text className="text-[14px] text-gray-300 m-0 leading-[20px]">
          <strong className="text-white">Security disclaimer:</strong> If you
          didn't request this sign-in link, you can safely ignore this email.
          Your account remains secure and no unauthorized access will occur.
        </Text>
      </Section>

      {/* Security Tips */}
      <Section className="bg-primary bg-opacity-10 border border-primary border-opacity-30 rounded-md p-6 mb-8">
        <Text className="text-[14px] text-black m-0 leading-[20px] text-center">
          <strong className="text-black">Security Tip:</strong> Always make sure
          you're signing in from a trusted device and secure network. Never
          share this link with anyone else.
        </Text>
      </Section>

      <SupportSection />
    </Layout>
  );
};

MagicLinkTemplate.PreviewProps = {
  magicLinkUrl: "https://ekvi.com/magic-link?token=abc123xyz789",
  userEmail: "stanisavljevic.igor@proton.me",
};

export default MagicLinkTemplate;
