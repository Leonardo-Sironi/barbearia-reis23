"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PainelBarbeiro() {
  const router = useRouter();

  const [agenda, setAgenda] = useState<{ [key: string]: any[] }>({});

  useEffect(() => {
    const tipo = localStorage.getItem("tipoUsuario");

    if (tipo !== "barbeiro") {
      router.push("/login-barbeiro");
      return;
    }

    const salvo = localStorage.getItem("agenda");
    if (salvo) {
      setAgenda(JSON.parse(salvo));
    }
  }, [router]);

  function cancelarAgendamento(data: string, index: number) {
    const novaAgenda = { ...agenda };

    novaAgenda[data].splice(index, 1);

    if (novaAgenda[data].length === 0) {
      delete novaAgenda[data];
    }

    setAgenda(novaAgenda);
    localStorage.setItem("agenda", JSON.stringify(novaAgenda));
  }

  return (
    <>
      <Link href="/" className="botao-voltar">
        ← Menu inicial
      </Link>

      <main className="pagina">
        <div className="card-formulario">
          <h1 className="titulo-formulario">Painel do Barbeiro</h1>

          {Object.keys(agenda).length === 0 && (
            <p style={{ textAlign: "center" }}>Nenhum agendamento ainda.</p>
          )}

          {Object.entries(agenda).map(([data, agendamentos]) => (
            <div key={data} style={{ marginBottom: "20px" }}>
              <h2>{data}</h2>

              {agendamentos.map((ag: any, index: number) => (
                <div
                  key={index}
                  style={{
                    background: "#222",
                    padding: "10px",
                    borderRadius: "8px",
                    marginBottom: "10px",
                  }}
                >
                  <p><strong>Horário:</strong> {ag.horario}</p>
                  <p><strong>Cliente:</strong> {ag.clienteNome}</p>
                  <p><strong>Email:</strong> {ag.clienteEmail}</p>
                  <p><strong>WhatsApp:</strong> {ag.clienteWhatsapp}</p>
                  <p><strong>Serviços:</strong> {ag.servicos}</p>
                  <p><strong>Valor:</strong> R$ {ag.valor}</p>

                  <button
                    onClick={() => cancelarAgendamento(data, index)}
                    style={{
                      marginTop: "10px",
                      background: "#ff4444",
                      color: "white",
                      border: "none",
                      padding: "8px",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}