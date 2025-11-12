import { Section, Text } from "@react-email/components";

export const Footer = () => {
  return (
    <Section className="border-t border-gray-700 pt-6">
      <Text className="text-xs text-gray-500 m-0 mb-2">EKVI Platform</Text>
      <Text className="text-xs text-gray-500 m-0 mb-2">
        123 Movement Street, Wellness City, WC 12345
      </Text>
      <Text className="text-xs text-gray-500 m-0">
        � {new Date().getFullYear()} EKVI. All rights reserved.
      </Text>
    </Section>
  );
};
