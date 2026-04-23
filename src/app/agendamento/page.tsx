"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

const servicosLista = [
  { nome: "Corte", preco: 30, duracao: 30 },
  { nome: "Máquina", preco: 15, duracao: 30 },
  { nome: "Bigode/Cavanhaque", preco: 15, duracao: 10 },
  { nome: "Sobrancelha", preco: 10, duracao: 10 },
  { nome: "Barba", preco: 30, duracao: 20 },
];

const horarios = [
  "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30",
];

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type AgendamentoTipo = {
  id?: string;
  data: string;
  horario: string;
  horariosBloqueados: string[];
  servicos: string;
  valor: number;
  duracao: number;
  clienteUid: string;
  clienteNome: string;
  clienteEmail: string;
  clienteWhatsapp: string;
  criadoEm: string;
};

export default function Agendamento() {
  const router = useRouter();

  const [mesAtual, setMesAtual] = useState(new Date().getMonth());
  const [anoAtual] = useState(new Date().getFullYear());
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);

  const [servicosSelecionados, setServicosSelecionados] = useState<any[]>([]);
  const [horarioSelecionado, setHorarioSelecionado] = useState("");

  const [agendaDoDia, setAgendaDoDia] = useState<AgendamentoTipo[]>([]);
  const [carregandoAgenda, setCarregandoAgenda] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [bloqueios, setBloqueios] = useState<{ [key: string]: string[] }>({});
  const [diasBloqueados, setDiasBloqueados] = useState<string[]>([]);

  useEffect(() => {
    const tipo = localStorage.getItem("tipoUsuario");

    if (tipo !== "cliente") {
      router.push("/login");
      return;
    }

    const salvoBloqueios = localStorage.getItem("bloqueiosHorarios");
    if (salvoBloqueios) {
      setBloqueios(JSON.parse(salvoBloqueios));
    }

    const salvoDiasBloqueados = localStorage.getItem("diasBloqueados");
    if (salvoDiasBloqueados) {
      setDiasBloqueados(JSON.parse(salvoDiasBloqueados));
    }
  }, [router]);

  useEffect(() => {
    async function carregarAgendamentosDoDia() {
      if (!dataSelecionada) {
        setAgendaDoDia([]);
        return;
      }

      try {
        setCarregandoAgenda(true);

        const q = query(
          collection(db, "agendamentos"),
          where("data", "==", dataSelecionada)
        );

        const snapshot = await getDocs(q);

        const lista: AgendamentoTipo[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as AgendamentoTipo),
        }));

        setAgendaDoDia(lista);
      } catch (error) {
        console.log("Erro ao carregar agendamentos:", error);
        setAgendaDoDia([]);
      } finally {
        setCarregandoAgenda(false);
      }
    }

    carregarAgendamentosDoDia();
  }, [dataSelecionada]);

  function diasNoMes(mes: number) {
    return new Date(anoAtual, mes + 1, 0).getDate();
  }

  function primeiroDiaSemana(mes: number) {
    return new Date(anoAtual, mes, 1).getDay();
  }

  function toggleServico(servico: any) {
    const existe = servicosSelecionados.find((s) => s.nome === servico.nome);

    if (existe) {
      setServicosSelecionados(servicosSelecionados.filter((s) => s.nome !== servico.nome));
    } else {
      setServicosSelecionados([...servicosSelecionados, servico]);
    }
  }

  function formatarDataLocal(data: Date) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  const hoje = useMemo(() => new Date(), []);
  const hojeString = formatarDataLocal(hoje);

  const limiteData = useMemo(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() + 30);
    return formatarDataLocal(limite);
  }, []);

  function dataEhPassada(data: string) {
    return data < hojeString;
  }

  function dataPassaDoLimite(data: string) {
    return data > limiteData;
  }

  const duracaoTotal = servicosSelecionados.reduce((t, s) => t + s.duracao, 0);
  const valorTotal = servicosSelecionados.reduce((t, s) => t + s.preco, 0);
  const blocos = Math.ceil(duracaoTotal / 30);

  const ocupadosDoDia = dataSelecionada
    ? agendaDoDia.flatMap((a) => a.horariosBloqueados)
    : [];

  const horariosBloqueadosDoDia = dataSelecionada ? bloqueios[dataSelecionada] || [] : [];
  const diaInteiroBloqueado = dataSelecionada ? diasBloqueados.includes(dataSelecionada) : false;

  async function agendar() {
    if (!dataSelecionada) {
      alert("Escolha um dia");
      return;
    }

    const diaSemana = new Date(`${dataSelecionada}T00:00:00`).getDay();

    if (diaSemana === 0) {
      alert("Não atendemos aos domingos.");
      return;
    }

    if (dataEhPassada(dataSelecionada)) {
      alert("Não é possível agendar em data passada.");
      return;
    }

    if (dataPassaDoLimite(dataSelecionada)) {
      alert("Você só pode agendar com até 30 dias de antecedência.");
      return;
    }

    if (diaInteiroBloqueado) {
      alert("Esse dia está bloqueado pelo barbeiro.");
      return;
    }

    if (servicosSelecionados.length === 0) {
      alert("Escolha pelo menos um serviço");
      return;
    }

    if (!horarioSelecionado) {
      alert("Escolha um horário");
      return;
    }

    const clienteLogado = localStorage.getItem("clienteLogado");

    if (!clienteLogado) {
      alert("Cliente não encontrado. Faça login novamente.");
      router.push("/login");
      return;
    }

    const cliente = JSON.parse(clienteLogado);

    const index = horarios.indexOf(horarioSelecionado);
    const horariosParaBloquear = horarios.slice(index, index + blocos);

    const conflitoAgenda = horariosParaBloquear.some((h) => ocupadosDoDia.includes(h));
    const conflitoBloqueio = horariosParaBloquear.some((h) => horariosBloqueadosDoDia.includes(h));

    if (conflitoAgenda || conflitoBloqueio) {
      alert("Esse horário está ocupado ou bloqueado.");
      return;
    }

    const novoAgendamento: AgendamentoTipo = {
      data: dataSelecionada,
      horario: horarioSelecionado,
      horariosBloqueados: horariosParaBloquear,
      servicos: servicosSelecionados.map((s) => s.nome).join(", "),
      valor: valorTotal,
      duracao: duracaoTotal,
      clienteUid: cliente.uid || "",
      clienteNome: cliente.nome || "",
      clienteEmail: cliente.email || "",
      clienteWhatsapp: cliente.whatsapp || "",
      criadoEm: new Date().toISOString(),
    };

    try {
      setSalvando(true);

      await addDoc(collection(db, "agendamentos"), novoAgendamento);

      setAgendaDoDia((prev) => [...prev, novoAgendamento]);

      alert("Agendamento salvo com sucesso!");

      setServicosSelecionados([]);
      setHorarioSelecionado("");
    } catch (error) {
      console.log("Erro ao salvar agendamento:", error);
      alert("Erro ao salvar agendamento.");
    } finally {
      setSalvando(false);
    }
  }

  const totalDias = diasNoMes(mesAtual);
  const inicioSemana = primeiroDiaSemana(mesAtual);

  return (
    <>
      <Link href="/" className="botao-voltar">
        ← Menu inicial
      </Link>

      <main className="pagina">
        <div className="card-formulario">
          <h1 className="titulo-formulario">Agendamento</h1>

          <p className="subtitulo-formulario">
            Escolha uma data disponível, selecione os serviços e confirme seu horário.
          </p>

          <div className="campo">
            <label className="label">Escolha o dia</label>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <button
                type="button"
                className="botao-navegacao-mes"
                onClick={() => setMesAtual((m) => (m > 0 ? m - 1 : 11))}
              >
                ◀
              </button>
              <strong>{meses[mesAtual]} {anoAtual}</strong>
              <button
                type="button"
                className="botao-navegacao-mes"
                onClick={() => setMesAtual((m) => (m < 11 ? m + 1 : 0))}
              >
                ▶
              </button>
            </div>

            <div className="dias-semana-grid">
              <span className="domingo-texto">D</span>
              <span>S</span>
              <span>T</span>
              <span>Q</span>
              <span>Q</span>
              <span>S</span>
              <span>S</span>
            </div>

            <div className="calendario-grid">
              {Array.from({ length: inicioSemana }).map((_, i) => (
                <div key={i}></div>
              ))}

              {Array.from({ length: totalDias }).map((_, i) => {
                const dia = i + 1;
                const dataFormatada = `${anoAtual}-${String(mesAtual + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
                const selecionado = dataSelecionada === dataFormatada;
                const domingo = new Date(anoAtual, mesAtual, dia).getDay() === 0;
                const diaBloqueado = diasBloqueados.includes(dataFormatada);
                const passado = dataEhPassada(dataFormatada);
                const foraLimite = dataPassaDoLimite(dataFormatada);

                return (
                  <button
                    key={dataFormatada}
                    type="button"
                    disabled={domingo || diaBloqueado || passado || foraLimite}
                    onClick={() => {
                      if (!domingo && !diaBloqueado && !passado && !foraLimite) {
                        setDataSelecionada(dataFormatada);
                      }
                    }}
                    className="botao-formulario"
                    style={{
                      backgroundColor: selecionado
                        ? "#4caf50"
                        : domingo
                        ? "#ff6b6b"
                        : diaBloqueado
                        ? "#222"
                        : passado || foraLimite
                        ? "#777"
                        : "#cccccc",
                      color: selecionado || domingo || diaBloqueado || passado || foraLimite ? "#fff" : "#111",
                      padding: "10px",
                      opacity: domingo || diaBloqueado || passado || foraLimite ? 0.6 : 1,
                      cursor: domingo ? "not-allowed" : "pointer",
                    }}
                  >
                    {dia}
                  </button>
                );
              })}
            </div>
          </div>

          {dataSelecionada && (
            <>
              {diaInteiroBloqueado && (
                <p style={{ color: "#ff6b6b", fontWeight: "bold" }}>
                  Esse dia está bloqueado pelo barbeiro.
                </p>
              )}

              {!diaInteiroBloqueado && (
                <>
                  <div className="campo">
                    <label className="label">Serviços</label>

                    <div className="botoes-grid">
                      {servicosLista.map((servico) => {
                        const selecionado = servicosSelecionados.find((s) => s.nome === servico.nome);

                        return (
                          <button
                            key={servico.nome}
                            type="button"
                            onClick={() => toggleServico(servico)}
                            className="botao-formulario"
                            style={{
                              backgroundColor: selecionado ? "#4caf50" : "#cccccc",
                              color: selecionado ? "#fff" : "#111",
                            }}
                          >
                            {servico.nome} - R${servico.preco}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="campo">
                    <label className="label">Horários</label>

                    {carregandoAgenda ? (
                      <p>Carregando horários...</p>
                    ) : (
                      <div className="botoes-grid">
                        {horarios.map((h) => {
                          const ocupado = ocupadosDoDia.includes(h);
                          const bloqueado = horariosBloqueadosDoDia.includes(h);
                          const selecionado = horarioSelecionado === h;

                          return (
                            <button
                              key={h}
                              type="button"
                              disabled={ocupado || bloqueado}
                              onClick={() => setHorarioSelecionado(h)}
                              className="botao-formulario"
                              style={{
                                backgroundColor: ocupado
                                  ? "#555"
                                  : bloqueado
                                  ? "#222"
                                  : selecionado
                                  ? "#4caf50"
                                  : "#cccccc",
                                color: ocupado || bloqueado || selecionado ? "#fff" : "#111",
                              }}
                            >
                              {ocupado
                                ? `${h} (ocupado)`
                                : bloqueado
                                ? `${h} (bloqueado)`
                                : h}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="resumo-box">
                    <p><strong>Duração total:</strong> {duracaoTotal} min</p>
                    <p><strong>Valor total:</strong> R$ {valorTotal}</p>
                  </div>

                  <button
                    className="botao-formulario botao-principal"
                    onClick={agendar}
                    disabled={salvando}
                  >
                    {salvando ? "Salvando..." : "Confirmar agendamento"}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}