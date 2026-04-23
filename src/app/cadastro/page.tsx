"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function CadastroPage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setMensagem("");

    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim();
    const whatsappLimpo = whatsapp.trim();

    if (!nomeLimpo || !emailLimpo || !whatsappLimpo || !senha) {
      setErro("Preencha todos os campos.");
      return;
    }

    if (senha.length < 6) {
      setErro("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    try {
      setCarregando(true);

      const credencial = await createUserWithEmailAndPassword(auth, emailLimpo, senha);
      const user = credencial.user;

      await setDoc(doc(db, "clientes", user.uid), {
        uid: user.uid,
        nome: nomeLimpo,
        email: emailLimpo,
        whatsapp: whatsappLimpo,
        criadoEm: new Date().toISOString(),
      });

      await sendEmailVerification(user);

      setMensagem("Cadastro realizado com sucesso! Confira seu e-mail para verificar a conta.");

      setNome("");
      setEmail("");
      setWhatsapp("");
      setSenha("");

      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        setErro("Este e-mail já está cadastrado.");
      } else if (error.code === "auth/invalid-email") {
        setErro("E-mail inválido.");
      } else if (error.code === "auth/weak-password") {
        setErro("Senha muito fraca.");
      } else if (error.code === "auth/configuration-not-found") {
        setErro("Ative Email/Password no Firebase Authentication.");
      } else {
        setErro(`Erro ao cadastrar: ${error?.code || "desconhecido"}`);
      }
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
          <h1>Criar conta</h1>

          <form onSubmit={handleCadastro} className="formulario">
            <input
              type="text"
              placeholder="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />

            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="text"
              placeholder="WhatsApp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
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
              {carregando ? "Cadastrando..." : "Cadastrar"}
            </button>
          </form>

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
            Já tem conta? <a href="/login">Entrar</a>
          </p>
        </div>
      </main>
    </>
  );
}