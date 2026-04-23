"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setMensagem("");

    const emailLimpo = email.trim();

    if (!emailLimpo || !senha) {
      setErro("Preencha todos os campos.");
      return;
    }

    try {
      setCarregando(true);

      const credencial = await signInWithEmailAndPassword(auth, emailLimpo, senha);
      const user = credencial.user;

      if (!user.emailVerified) {
        await sendEmailVerification(user);
        await signOut(auth);

        setErro(
          "Seu e-mail ainda não foi verificado. Enviamos novamente o link de confirmação. Verifique sua caixa de entrada, spam e promoções. Geralmente o e-mail de confirmação pode cair no spam."
        );
        return;
      }

      let clienteLogado = {
        uid: user.uid,
        nome: "",
        email: user.email || emailLimpo,
        whatsapp: "",
      };

      try {
        const docRef = doc(db, "clientes", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const dados = docSnap.data();

          clienteLogado = {
            uid: user.uid,
            nome: dados.nome || "",
            email: dados.email || user.email || emailLimpo,
            whatsapp: dados.whatsapp || "",
          };
        }
      } catch (error) {
        console.log("Erro ao buscar cliente:", error);
      }

      localStorage.setItem("clienteLogado", JSON.stringify(clienteLogado));
      localStorage.setItem("tipoUsuario", "cliente");

      router.push("/agendamento");
    } catch (error: any) {
      if (error.code === "auth/invalid-credential") {
        setErro("E-mail ou senha incorretos.");
      } else if (error.code === "auth/invalid-email") {
        setErro("E-mail inválido.");
      } else if (error.code === "auth/too-many-requests") {
        setErro("Muitas tentativas. Aguarde um pouco e tente novamente.");
      } else {
        setErro(`Erro ao fazer login: ${error?.code || "desconhecido"}`);
      }
    } finally {
      setCarregando(false);
    }
  }

  async function reenviarVerificacao() {
    setErro("");
    setMensagem("");

    const emailLimpo = email.trim();

    if (!emailLimpo || !senha) {
      setErro("Digite seu e-mail e senha para reenviar a verificação.");
      return;
    }

    try {
      setCarregando(true);

      const credencial = await signInWithEmailAndPassword(auth, emailLimpo, senha);
      const user = credencial.user;

      if (user.emailVerified) {
        setMensagem("Seu e-mail já está verificado.");
        await signOut(auth);
        return;
      }

      await sendEmailVerification(user);
      await signOut(auth);

      setMensagem(
        "Link de verificação reenviado. Confira caixa de entrada, spam e promoções."
      );
    } catch (error: any) {
      setErro(`Não foi possível reenviar: ${error?.code || "erro desconhecido"}`);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <Link href="/" className="botao-voltar">
        ← Menu inicial
      </Link>

      <main className="container">
        <div className="card">
          <h1>Entrar</h1>

          <form onSubmit={handleLogin} className="formulario">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="linha-senha">
              <input
                type={mostrarSenha ? "text" : "password"}
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />

              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="botao-secundario"
              >
                {mostrarSenha ? "Ocultar" : "Mostrar"}
              </button>
            </div>

            <button type="submit" disabled={carregando}>
              {carregando ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <button
            type="button"
            onClick={reenviarVerificacao}
            disabled={carregando}
            className="botao-reenviar"
          >
            Reenviar verificação
          </button>

          {mensagem && <p className="mensagem-sucesso">{mensagem}</p>}
          {erro && <p className="mensagem-erro">{erro}</p>}

          <p style={{ marginTop: "16px", textAlign: "center" }}>
            Não tem conta? <a href="/cadastro">Criar conta</a>
          </p>
        </div>
      </main>
    </>
  );
}