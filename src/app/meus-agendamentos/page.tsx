"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";

type Agendamento = {
  id: string;
  data: string;
  horario: string;
  servicos: string;
  valor: number;
  duracao: number;
  clienteUid: string;
  clienteNome: string;
  clienteEmail: string;
  clienteWhatsapp: string;
};

export default function MeusAgendamentosPage() {
  const router = useRouter();

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarMeusAgendamentos() {
      const tipo = localStorage.getItem("tipoUsuario");
      const clienteSalvo = localStorage.getItem("clienteLogado");

      if (tipo !== "cliente" || !clienteSalvo) {
        router.push("/login");
        return;
      }

      const cliente = JSON.parse(clienteSalvo);

      try {
        const q = query(
          collection(db, "agendamentos"),
          where("clienteUid", "==", cliente.uid),
          orderBy("data", "asc")
        );

        const snapshot = await getDocs(q);

        const lista: Agendamento[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Agendamento, "id">),
        }));

        const ordenados = lista.sort((a, b) => {
          return `${a.data} ${a.horario}`.localeCompare(`${b.data} ${b.horario}`);
        });

        setAgendamentos(ordenados);
      } catch (error) {
        console.log("Erro ao buscar meus agendamentos:", error);
      } finally {
        setCarregando(false);
      }
    }

    carregarMeusAgendamentos();
  }, [router]);

  function formatarData(data: string) {
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  return (
    <>
      <Link href="/" className="botao-voltar">
        ← Menu inicial
      </Link>

      <main className="pagina">
        <div className="card-formulario">
          <h1 className="titulo-formulario">Meus agendamentos</h1>

          <p className="subtitulo-formulario">
            Veja seus horários marcados na barbearia.
          </p>

          <Link href="/agendamento" className="botao-link-roxo">
            Fazer novo agendamento
          </Link>

          {carregando && <p>Carregando...</p>}

          {!carregando && agendamentos.length === 0 && (
            <p style={{ textAlign: "center", marginTop: "20px" }}>
              Você ainda não possui agendamentos.
            </p>
          )}

          {agendamentos.map((ag) => (
            <div key={ag.id} className="card-agendamento">
              <p><strong>Data:</strong> {formatarData(ag.data)}</p>
              <p><strong>Horário:</strong> {ag.horario}</p>
              <p><strong>Serviços:</strong> {ag.servicos}</p>
              <p><strong>Duração:</strong> {ag.duracao} min</p>
              <p><strong>Valor:</strong> R$ {ag.valor}</p>
              <p><strong>Cliente:</strong> {ag.clienteNome}</p>
              <p><strong>WhatsApp:</strong> {ag.clienteWhatsapp}</p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}