"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../lib/firebase";
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
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
  "09:00", "09:30",
  "10:00", "10:30",
  "11:00", "11:30",
  "13:00", "13:30",
  "14:00", "14:30",
  "15:00", "15:30",
  "16:00", "16:30",
  "17:00", "17:30",
  "18:00", "18:30",
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

type BloqueioDia = {
  diaInteiro: boolean;
  horarios: string[];
};

export default function Agendamento() {
  const router = useRouter();

  const [mesAtual, setMesAtual] = useState(new Date().getMonth());
  const [anoAtual] = useState(new Date().getFullYear());
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);

  const [servicosSelecionados, setServicosSelecionados] = useState<any[]>([]);
  const [horarioSelecionado, setHorarioSelecionado] = useState("");

  const [agendaDoDia, setAgendaDoDia] = useState<AgendamentoTipo[]>([]);
  const [bloqueioDia, setBloqueioDia] = useState<BloqueioDia>({
    diaInteiro: false,
    horarios: [],
  });

  const [carregandoAgenda, setCarregandoAgenda] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const tipo = localStorage.getItem("tipoUsuario");

    if (tipo !== "cliente") {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    async function carregarDadosDoDia() {
      if (!dataSelecionada) {
        setAgendaDoDia([]);
        setBloqueioDia({ diaInteiro: false, horarios: [] });
        return;
      }

      try {
        setCarregandoAgenda(true);

        const q = query(
          collection(db, "agendamentos"),
          where("data", "==", dataSelecionada)
        );

        const snapshot = await getDocs(q);

        const lista: AgendamentoTipo[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as AgendamentoTipo),
        }));

        setAgendaDoDia(lista);

        const bloqueioRef = doc(db, "bloqueios", dataSelecionada);
        const bloqueioSnap = await getDoc(bloqueioRef);

        if (bloqueioSnap.exists()) {
          const dados = bloqueioSnap.data() as BloqueioDia;
          setBloqueioDia({
            diaInteiro: dados.diaInteiro || false,
            horarios: dados.horarios || [],
          });
        } else {
          setBloqueioDia({ diaInteiro: false, horarios: [] });
        }
      } catch (error) {
        console.log("Erro ao carregar dados do dia:", error);
      } finally {
        setCarregandoAgenda(false);
      }
    }

    carregarDadosDoDia();
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

  function horarioJaPassou(data: string, horario: string) {
    const agora = new Date();

    const [ano, mes, dia] = data.split("-").map(Number);
    const [hora, minuto] = horario.split(":").map(Number);

    const dataHorario = new Date(ano, mes - 1, dia, hora, minuto);

    return dataHorario <= agora;
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

  const horariosBloqueadosDoDia = bloqueioDia.horarios || [];
  const diaInteiroBloqueado = bloqueioDia.diaInteiro;

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
      alert("Escolha pelo menos um serviço.");
      return;
    }

    if (!horarioSelecionado) {
      alert("Escolha um horário.");
      return;
    }

    if (horarioJaPassou(dataSelecionada, horarioSelecionado)) {
      alert("Esse horário já passou. Escolha outro horário.");
      return;
    }

    const clienteLogado = localStorage.getItem("clienteLogado");

    if (!clienteLogado) {
      alert("Cliente não encontrado. Faça login novamente.");
      router.push("/login");
      return;
    }

    const cliente = JSON.parse(clienteLogado);
    console.log("CLIENTE LOGADO:", cliente);

    const index = horarios.indexOf(horarioSelecionado);
    const horariosParaBloquear = horarios.slice(index, index + blocos);

    if (horariosParaBloquear.length < blocos) {
      alert("Esse horário não tem tempo suficiente para os serviços escolhidos.");
      return;
    }

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
  clienteEmail: (cliente.email || "").toLowerCase().trim(),
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

  function logout() {
    localStorage.removeItem("clienteLogado");
    localStorage.removeItem("tipoUsuario");
    router.push("/");
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
          <div className="topo-painel">
            <div>
              <h1 className="titulo-formulario">Agendamento</h1>
              <p className="subtitulo-formulario">
                Escolha uma data, selecione os serviços e confirme seu horário.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Link href="/meus-agendamentos" className="botao-link-roxo">
                Meus agendamentos
              </Link>

              <button onClick={logout} className="botao-sair">
                Sair
              </button>
            </div>
          </div>

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
                const passado = dataEhPassada(dataFormatada);
                const foraLimite = dataPassaDoLimite(dataFormatada);

                return (
                  <button
                    key={dataFormatada}
                    type="button"
                    disabled={domingo || passado || foraLimite}
                    onClick={() => setDataSelecionada(dataFormatada)}
                    className="botao-formulario"
                    style={{
                      backgroundColor: selecionado
                        ? "#4caf50"
                        : domingo
                        ? "#ff6b6b"
                        : passado || foraLimite
                        ? "#777"
                        : "#cccccc",
                      color: selecionado || domingo || passado || foraLimite ? "#fff" : "#111",
                      opacity: domingo || passado || foraLimite ? 0.6 : 1,
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
                <p className="mensagem-erro">
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
                          const passou = dataSelecionada ? horarioJaPassou(dataSelecionada, h) : false;

                          return (
                            <button
                              key={h}
                              type="button"
                              disabled={ocupado || bloqueado || passou}
                              onClick={() => setHorarioSelecionado(h)}
                              className="botao-formulario"
                              style={{
                                backgroundColor: ocupado
                                  ? "#555"
                                  : bloqueado
                                  ? "#222"
                                  : passou
                                  ? "#777"
                                  : selecionado
                                  ? "#4caf50"
                                  : "#cccccc",
                                color: ocupado || bloqueado || passou || selecionado ? "#fff" : "#111",
                                opacity: passou ? 0.6 : 1,
                              }}
                            >
                              {ocupado
                                ? `${h} ocupado`
                                : bloqueado
                                ? `${h} bloqueado`
                                : passou
                                ? `${h} passou`
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