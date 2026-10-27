import { BoutonRetour } from "@/components/ui/BoutonRetour";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative isolate -mt-16 min-h-screen bg-paper">
      <div className="mx-auto max-w-md px-5 pt-5">
        <BoutonRetour label="Retour" repli="/" forcer />
      </div>
      {children}
    </div>
  );
}
