import { Navigate } from "react-router-dom";

// Redirect to admin page - audit grid is now integrated there
export default function AdminAuditGrid() {
  return <Navigate to="/admin/application?tab=audits" replace />;
}
