import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center">
      <Compass className="w-12 h-12 text-accent mx-auto mb-4" />
      <h1 className="text-3xl font-bold mb-2">Lost in the dark</h1>
      <p className="text-muted mb-6">No route matches this URL.</p>
      <Link to="/" className="btn-primary inline-flex">
        Back home
      </Link>
    </div>
  );
}
