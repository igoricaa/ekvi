import { Heading, Section, Text } from "@react-email/components";

export const Header = () => {
  return (
    <Section className="text-center mb-8">
      <Heading className="text-[32px] font-bold text-white m-0 mb-2">
        EKVI
      </Heading>
      <Text className="text-base text-gray-400 m-0">
        Where movement meets wisdom
      </Text>
    </Section>
  );
};
