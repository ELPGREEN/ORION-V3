import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function CadastroCliente() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/auth?tab=cadastro&tipo=cliente", { replace: true });
  }, [navigate]);

  return null;
}