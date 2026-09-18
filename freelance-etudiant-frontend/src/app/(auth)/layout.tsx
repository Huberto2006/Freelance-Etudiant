import { BoutonRetour } from "@/components/ui/BoutonRetour";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative isolate -mt-16 min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/auth-kianja.png')",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-paper-light/60 backdrop-blur-[2px]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-paper-light/70 via-paper-light/55 to-paper-light/75"
        aria-hidden="true"
      />
      <div className="relative z-10">
        <div className="mx-auto max-w-md px-5 pt-5">
          <BoutonRetour
            label="Retour"
            repli="/"
            forcer
          />
        </div>
        {children}
      </div>
    </div>
  );
}