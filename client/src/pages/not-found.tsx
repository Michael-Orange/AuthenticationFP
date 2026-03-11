import { Button } from "@/components/ui/button";
import { Leaf, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col">
      <div className="w-full h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-200">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
          <p className="text-lg text-muted-foreground mb-6">Page introuvable</p>
          <Link href="/dashboard">
            <Button
              data-testid="button-back-home"
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au tableau de bord
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
