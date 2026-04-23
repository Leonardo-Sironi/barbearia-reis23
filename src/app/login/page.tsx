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
      console.log("1 - iniciando login");

      const credencial = await signInWithEmailAndPassword(auth, emailLimpo, senha);
      const user = credencial.user;
      console.log("2 - login auth ok", user.uid);

      if (!user.emailVerified) {
        console.log("3 - email não verificado");
        await sendEmailVerification(user);
        await signOut(auth);

        setErro(
          "Seu e-mail ainda não foi verificado. Enviamos novamente o link de confirmação. Verifique seu e-mail."
        );
        return;
      }

      console.log("3 - email verificado");

      let clienteLogado = {
        uid: user.uid,
        nome: "",
        email: user.email || emailLimpo,
        whatsapp: "",
      };

      try {
        console.log("4 - buscando firestore");
        const docRef = doc(db, "clientes", user.uid);

        const resultado = await Promise.race([
          getDoc(docRef),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout-firestore")), 5000)
          ),
        ]);

        const docSnap: any = resultado;

        if (docSnap.exists()) {
          const dados = docSnap.data();

          clienteLogado = {
            uid: user.uid,
            nome: dados.nome || "",
            email: dados.email || user.email || emailLimpo,
            whatsapp: dados.whatsapp || "",
          };

          console.log("5 - firestore ok", clienteLogado);
        } else {
          console.log("5 - documento do cliente não existe, entrando mesmo assim");
        }
      } catch (erroFirestore) {
        console.log("5 - erro firestore, entrando mesmo assim", erroFirestore);
      }

      localStorage.setItem("clienteLogado", JSON.stringify(clienteLogado));
      localStorage.setItem("tipoUsuario", "cliente");
      console.log("6 - localStorage salvo");

      setMensagem("Login realizado com sucesso!");
      console.log("7 - redirecionando");

      router.push("/agendamento");
    } catch (error: any) {
      console.log("ERRO LOGIN:", error);
      console.log("CODE:", error?.code);
      console.log("MESSAGE:", error?.message);

      if (error.code === "auth/invalid-credential") {
        setErro("E-mail ou senha incorretos.");
      } else if (error.code === "auth/invalid-email") {
        setErro("E-mail inválido.");
      } else if (error.code === "auth/too-many-requests") {
        setErro("Muitas tentativas. Aguarde um pouco e tente novamente.");
      } else {
        setErro(`Erro ao fazer login: ${error?.code || error?.message || "desconhecido"}`);
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

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type={mostrarSenha ? "text" : "password"}
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                style={{ flex: 1 }}
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
            className="botao-secundario"
            style={{ width: "100%", marginTop: "12px" }}
          >
            Reenviar verificação
          </button>

          {mensagem && (
            <p style={{ color: "#22c55e", marginTop: "12px", textAlign: "center" }}>
              {mensagem}
            </p>
          )}

          {erro && (
            <p style={{ color: "#ef4444", marginTop: "12px", textAlign: "center" }}>
              {erro}
            </p>
          )}

          <p style={{ marginTop: "16px", textAlign: "center" }}>
            Não tem conta? <a href="/cadastro">Criar conta</a>
          </p>
        </div>
      </main>
    </>
  );
}