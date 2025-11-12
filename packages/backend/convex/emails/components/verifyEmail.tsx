import { Heading, Link, Section, Text } from "@react-email/components";
import { Button } from "./Button";
import { Layout } from "./Layout";
import SupportSection from "./SupportSection";

const VerifyEmailTemplate = ({
  verificationUrl,
}: {
  verificationUrl: string;
}) => {
  return (
    <Layout preview="Verify your email to start your EKVI journey">
      {/* Main Content */}
      <Section className="mb-8">
        <Heading className="text-2xl font-bold text-white mb-4 m-0">
          Verify Your Email Address
        </Heading>

        <Text className="text-base text-gray-300 mb-4 m-0 leading-[24px]">
          Welcome to EKVI! We're excited to have you join our community of
          athletes, coaches, and movement enthusiasts.
        </Text>

        <Text className="text-base text-gray-300 mb-12 m-0 leading-[24px]">
          To complete your registration and start accessing evidence-based
          training programs, masterclasses, and mentorship opportunities, please
          verify your email address by clicking the button below:
        </Text>

        <Section className="text-center my-8">
          <Button href={verificationUrl}>Verify Email Address</Button>
        </Section>

        <Text className="text-sm text-gray-400 mb-4 m-0 leading-[20px]">
          If the button doesn't work, you can copy and paste this link into your
          browser:
        </Text>

        <Text className="text-sm text-primary mb-6 m-0 break-all">
          <Link href={verificationUrl} className="text-primary underline">
            {verificationUrl}
          </Link>
        </Text>

        <Text className="text-sm text-gray-400 m-0 leading-[20px]">
          This verification link will expire in 24 hours for security purposes.
        </Text>
      </Section>

      {/* What's Next Section */}
      <Section className="bg-gray-900 rounded-[8px] p-6 mb-8">
        <Heading className="text-lg font-bold text-white mb-4 m-0">
          What's waiting for you on EKVI:
        </Heading>

        <Text className="text-sm text-gray-300 mb-2 m-0 leading-[20px]">
          • Access to evidence-based training programs across all disciplines
        </Text>
        <Text className="text-sm text-gray-300 mb-2 m-0 leading-[20px]">
          • Direct mentorship from experienced coaches and sport professionals
        </Text>
        <Text className="text-sm text-gray-300 mb-2 m-0 leading-[20px]">
          • Video-based courses and masterclasses for every skill level
        </Text>
        <Text className="text-sm text-gray-300 mb-2 m-0 leading-[20px]">
          • Progress tracking with video analysis support
        </Text>
        <Text className="text-sm text-gray-300 m-0 leading-[20px]">
          • A supportive community focused on sustainable, intelligent movement
        </Text>
      </Section>

      <SupportSection />
    </Layout>
  );
};

VerifyEmailTemplate.PreviewProps = {
  verificationUrl: "https://ekvilibrijum.rs/verify-email?token=abc123xyz789",
  userEmail: "stanisavljevic.igor@proton.me",
};

export default VerifyEmailTemplate;
