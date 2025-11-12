import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Tailwind,
} from "@react-email/components";
import { Footer } from "./Footer";
import { Header } from "./Header";

type LayoutProps = {
  preview: string;
  children: React.ReactNode;
};

export const Layout = ({ preview, children }: LayoutProps) => {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                primary: "#09f097",
                background: "#0d0d0e",
                foreground: "#fff",
              },
            },
          },
        }}
      >
        <Body className="bg-background font-sans py-10">
          <Container className="bg-background rounded-[8px] max-w-[600px] mx-auto p-10">
            <Header />
            {children}
            <Footer />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
