import { Navigate } from "react-router-dom";

/** Ancienne route `/admin/application` : redirection vers Modules. */
export default function AdminApplication() {
  return <Navigate to="/admin/modules" replace />;
}
