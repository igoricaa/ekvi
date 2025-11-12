import { Heading, Link, Section, Text } from "@react-email/components";
import { Button } from "./Button";
import { Layout } from "./Layout";
import SupportSection from "./SupportSection";

const WelcomeEmailTemplate = ({
  userName,
  dashboardUrl,
  programsUrl,
  communityUrl,
  // supportUrl,
}: {
  userName: string;
  dashboardUrl: string;
  programsUrl: string;
  communityUrl: string;
  // supportUrl: string;
}) => {
  return (
    <Layout preview="Welcome to EKVI - Your movement journey starts now!">
      {/* Main Content */}
      <Section className="mb-[32px]">
        <Heading className="text-[24px] font-bold text-white mb-[16px] m-0">
          Welcome to EKVI, {userName}! 🎉
        </Heading>

        <Text className="text-[16px] text-gray-300 mb-[16px] m-0 leading-[24px]">
          Congratulations! Your email has been verified and you're now
          officially part of the EKVI community. We're thrilled to have you join
          thousands of athletes, coaches, and movement enthusiasts on their
          journey to smarter, more sustainable training.
        </Text>

        <Text className="text-[16px] text-gray-300 mb-[48px] m-0 leading-[24px]">
          Your account is fully activated and ready to explore. Let's get you
          started with everything EKVI has to offer:
        </Text>

        <Section className="text-center my-8">
          <Button href={dashboardUrl}>Go to Your Dashboard</Button>
        </Section>
      </Section>

      {/* Next Steps Section */}
      <Section className="bg-gray-900 rounded-[8px] p-[24px] mb-[32px]">
        <Heading className="text-[18px] font-bold text-white mb-[16px] m-0">
          Your Next Steps
        </Heading>

        <Text className="text-[14px] text-gray-300 mb-[16px] m-0 leading-[20px]">
          <strong className="text-white">1. Complete Your Profile</strong>
          <br />
          Add your training background, goals, and preferences to get
          personalized recommendations.
        </Text>

        <Text className="text-[14px] text-gray-300 mb-[16px] m-0 leading-[20px]">
          <strong className="text-white">2. Explore Training Programs</strong>
          <br />
          Browse our evidence-based programs designed for every skill level and
          discipline.
        </Text>

        <Text className="text-[14px] text-gray-300 mb-[16px] m-0 leading-[20px]">
          <strong className="text-white">3. Join the Community</strong>
          <br />
          Connect with fellow athletes and coaches in our supportive community
          forums.
        </Text>

        <Text className="text-[14px] text-gray-300 m-0 leading-[20px]">
          <strong className="text-white">4. Book Your First Session</strong>
          <br />
          Schedule a mentorship session or join a masterclass to accelerate your
          progress.
        </Text>
      </Section>

      {/* Key Resources Section */}
      <Section className="mb-8">
        <Heading className="text-[18px] font-bold text-white mb-[16px] m-0">
          Key Resources to Get Started
        </Heading>

        <Section className="mb-4">
          <Button variant="secondary" href={programsUrl}>
            Browse Programs
          </Button>
          <Button variant="secondary" href={communityUrl}>
            Join Community
          </Button>
        </Section>

        <Text className="text-[14px] text-gray-300 mb-[12px] m-0 leading-[20px]">
          <Link
            href={`${dashboardUrl}/library`}
            className="text-primary underline"
          >
            Knowledge Library
          </Link>{" "}
          - Access our comprehensive collection of articles and research
        </Text>

        <Text className="text-[14px] text-gray-300 mb-[12px] m-0 leading-[20px]">
          <Link
            href={`${dashboardUrl}/masterclasses`}
            className="text-primary underline"
          >
            Masterclasses
          </Link>{" "}
          - Learn from industry experts through video courses
        </Text>

        <Text className="text-[14px] text-gray-300 mb-[12px] m-0 leading-[20px]">
          <Link
            href={`${dashboardUrl}/mentorship`}
            className="text-primary underline"
          >
            Find a Mentor
          </Link>{" "}
          - Connect with experienced coaches for personalized guidance
        </Text>

        <Text className="text-[14px] text-gray-300 mb-[12px] m-0 leading-[20px]">
          <Link
            href={`${dashboardUrl}/mobile-app`}
            className="text-primary underline"
          >
            Mobile App
          </Link>{" "}
          - Download our app for training on the go
        </Text>

        <Text className="text-[14px] text-gray-300 m-0 leading-[20px]">
          <Link
            href={`${dashboardUrl}/progress`}
            className="text-primary underline"
          >
            Progress Tracking
          </Link>{" "}
          - Monitor your development with our advanced analytics
        </Text>
      </Section>

      {/* Community Message */}
      <Section className="bg-primary bg-opacity-10 border border-primary border-opacity-30 rounded-md p-6 mb-8">
        <Text className="text-[14px] text-black m-0 leading-[20px] text-center">
          <strong className="text-black">Pro Tip:</strong> Introduce yourself in
          the community forum and let us know what you're working on. Our
          members love welcoming newcomers and sharing their experiences!
        </Text>
      </Section>

      <SupportSection />
    </Layout>
  );
};

WelcomeEmailTemplate.PreviewProps = {
  userName: "John Doe",
  dashboardUrl: "https://ekvi.com/dashboard",
  programsUrl: "https://ekvi.com/programs",
  communityUrl: "https://ekvi.com/community",
  supportUrl: "https://ekvi.com/support",
  userEmail: "stanisavljevic.igor@proton.me",
};

export default WelcomeEmailTemplate;
