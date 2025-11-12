import { Link, Section, Text } from "@react-email/components";

const SupportSection = () => {
  return (
    <Section className="mb-8">
      <Text className="text-sm text-gray-400 m-0 leading-[20px]">
        Need help? Our support team is here to assist you. Reply to this email
        or contact us at{" "}
        <Link href="mailto:support@ekvi.com" className="text-primary underline">
          support@ekvi.com
        </Link>
      </Text>
    </Section>
  );
};

export default SupportSection;
