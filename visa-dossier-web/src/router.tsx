import { createBrowserRouter } from "react-router-dom";
import { DossierPage, dossierAction, dossierLoader } from "./routes/dossier";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <DossierPage />,
    loader: dossierLoader,
    action: dossierAction,
  },
]);

