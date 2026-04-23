"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginBarbeiro() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (email === "admin@barbearia.com" && senha === "123456") {
      localStorage.setItem("tipoUsuario", "barbeiro");

      router.push("/barbeiro");
    } else {
      setErro("E-mail ou senha incorretos.");
    }
  }

  return (
    <>
      <Link href="/" className="botao-voltar">
        ← Menu inicial
      </Link>

      <main className="container">
        <div className="card">
          <h1>Login Barbeiro</h1>

          <form onSubmit={handleLogin} className="formulario">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />

            <button type="submit">Entrar</button>
          </form>

          {erro && (
            <p style={{ color: "red", textAlign: "center", marginTop: "10px" }}>
              {erro}
            </p>
          )}
        </div>
      </main>
    </>
  );
}