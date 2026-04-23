"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";

const horarios = [
  "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30",
];

type Agendamento = {
  id: string;
  data: string;
  horario: string;
  horariosBloqueados?: string[];
  servicos: string;
  valor: number;
  duracao?: number;
  clienteNome: string;
  clienteEmail: string;
  clienteWhatsapp: string;
};

type BloqueioDia = {
  diaInteiro: boolean;
  horarios: string[];
};

function dataHoje() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export default function PainelBarbeiro() {
  const router = useRouter();

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [dataFiltro, setDataFiltro] = useState(dataHoje());
  const [carregando, setCarregando] = useState(true);
  const [bloqueio, setBloqueio] = useState<BloqueioDia>({
    diaInteiro: false,
    horarios: [],
  });

  useEffect(() => {
    const tipo = localStorage.getItem("tipoUsuario");

    if (tipo !== "barbeiro") {
      router.push("/login-barbeiro");
      return;
    }

    carregarDados();
  }, [router, dataFiltro]);

  async function carregarDados() {
    try {
      setCarregando(true);

      const snapshot = await getDocs(collection(db, "agendamentos"));

      const lista: Agendamento[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Agendamento, "id">),
      }));

      const ordenados = lista.sort((a, b) => {
        const dataA = `${a.data} ${a.horario}`;
        const dataB = `${b.data} ${b.horario}`;
        return dataA.localeCompare(dataB);
      });

      setAgendamentos(ordenados);

      const bloqueioRef = doc(db, "bloqueios", dataFiltro);
      const bloqueioSnap = await getDoc(bloqueioRef);

      if (bloqueioSnap.exists()) {
        const dados = bloqueioSnap.data() as BloqueioDia;
        setBloqueio({
          diaInteiro: dados.diaInteiro || false,
          horarios: dados.horarios || [],
        });
      } else {
        setBloqueio({
          diaInteiro: false,
          horarios: [],
        });
      }
    } catch (error) {
      console.log("Erro ao carregar dados:", error);
    } finally {
      setCarregando(false);
    }
  }

  async function cancelarAgendamento(id: string) {
    if (!confirm("Deseja cancelar este agendamento?")) return;

    try {
      await deleteDoc(doc(db, "agendamentos", id));
      setAgendamentos((prev) => prev.filter((ag) => ag.id !== id));
      alert("Agendamento cancelado.");
    } catch (error) {
      console.log("Erro ao cancelar:", error);
      alert("Erro ao cancelar agendamento.");
    }
  }

  async function salvarBloqueio(novoBloqueio: BloqueioDia) {
    try {
      await setDoc(doc(db, "bloqueios", dataFiltro), novoBloqueio);
      setBloqueio(novoBloqueio);
    } catch (error) {
      console.log("Erro ao salvar bloqueio:", error);
      alert("Erro ao salvar bloqueio.");
    }
  }

  async function alternarDiaInteiro() {
    const novoBloqueio = {
      ...bloqueio,
      diaInteiro: !bloqueio.diaInteiro,
    };

    await salvarBloqueio(novoBloqueio);
  }

  async function alternarHorario(horario: string) {
    const jaBloqueado = bloqueio.horarios.includes(horario);

    const novosHorarios = jaBloqueado
      ? bloqueio.horarios.filter((h) => h !== horario)
      : [...bloqueio.horarios, horario];

    await salvarBloqueio({
      ...bloqueio,
      horarios: novosHorarios,
    });
  }

  function logout() {
    localStorage.removeItem("tipoUsuario");
    router.push("/");
  }

  const agendamentosDoDia = useMemo(() => {
    return agendamentos.filter((ag) => ag.data === dataFiltro);
  }, [agendamentos, dataFiltro]);

  return (
    <>
      <Link href="/" className="botao-voltar">
        ← Menu inicial
      </Link>

      <main className="pagina">
        <div className="card-formulario">
          <div className="topo-painel">
            <div>
              <h1 className="titulo-formulario">Painel do Barbeiro</h1>
              <p className="subtitulo-formulario">
                Controle agendamentos, bloqueios e cancelamentos.
              </p>
            </div>

            <button onClick={logout} className="botao-sair">
              Sair
            </button>
          </div>

          <div className="painel-box">
            <label className="label">Filtrar por data</label>
            <input
              type="date"
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
              className="input-data"
            />
          </div>

          <div className="painel-box">
            <h2>Bloqueios do dia</h2>

            <button
              onClick={alternarDiaInteiro}
              className={bloqueio.diaInteiro ? "botao-perigo" : "botao-principal-painel"}
            >
              {bloqueio.diaInteiro ? "Desbloquear dia inteiro" : "Bloquear dia inteiro"}
            </button>

            <h3 style={{ marginTop: "16px" }}>Bloquear horários específicos</h3>

            <div className="botoes-grid">
              {horarios.map((h) => {
                const bloqueado = bloqueio.horarios.includes(h);

                return (
                  <button
                    key={h}
                    onClick={() => alternarHorario(h)}
                    className="botao-formulario"
                    style={{
                      background: bloqueado ? "#ef4444" : "#cccccc",
                      color: bloqueado ? "#fff" : "#111",
                    }}
                  >
                    {bloqueado ? `${h} bloqueado` : h}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="painel-box">
            <h2>Agendamentos do dia</h2>

            {carregando && <p>Carregando...</p>}

            {!carregando && agendamentosDoDia.length === 0 && (
              <p>Nenhum agendamento nesta data.</p>
            )}

            {agendamentosDoDia.map((ag) => (
              <div key={ag.id} className="card-agendamento">
                <p><strong>Data:</strong> {ag.data}</p>
                <p><strong>Horário:</strong> {ag.horario}</p>
                <p><strong>Cliente:</strong> {ag.clienteNome || "Não informado"}</p>
                <p><strong>Email:</strong> {ag.clienteEmail}</p>
                <p><strong>WhatsApp:</strong> {ag.clienteWhatsapp || "Não informado"}</p>
                <p><strong>Serviços:</strong> {ag.servicos}</p>
                <p><strong>Duração:</strong> {ag.duracao || "-"} min</p>
                <p><strong>Valor:</strong> R$ {ag.valor}</p>

                <button
                  onClick={() => cancelarAgendamento(ag.id)}
                  className="botao-perigo"
                >
                  Cancelar agendamento
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}