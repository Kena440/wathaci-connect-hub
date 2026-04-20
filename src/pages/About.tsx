import AppLayout from "@/components/AppLayout";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const About = () => {
  const missionRef = useScrollReveal();
  const visionRef = useScrollReveal();
  const teamRef = useScrollReveal();

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-16 space-y-32">
        <section ref={missionRef} className="opacity-0">
          <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
          <p className="text-lg text-muted-foreground">
            We aim to empower businesses with tools and resources that make
            compliance simple and growth achievable.
          </p>
        </section>

        <section ref={visionRef} className="opacity-0">
          <h2 className="text-3xl font-bold mb-4">Our Vision</h2>
          <p className="text-lg text-muted-foreground">
            To be the leading platform connecting entrepreneurs with services
            and knowledge across the region.
          </p>
        </section>

        <section ref={teamRef} className="opacity-0">
          <h2 className="text-3xl font-bold mb-4">Our Team</h2>
          <p className="text-lg text-muted-foreground">
            Our diverse team combines expertise in technology, finance, and law
            to support our community.
          </p>
        </section>
      </div>
    </AppLayout>
  );
};

export default About;
