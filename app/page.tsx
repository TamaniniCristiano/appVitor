export default function Home() {
  return (
    <main className="home-wrap">
      <div className="home-box">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="home-logo" alt="Vitor Rafael" src="/img/LogoVitorRafael.svg" />
        <h1>★ Convite privado</h1>
        <p>Este endereço é só pra quem recebeu o link com código no WhatsApp.</p>
        <small>
          🎂 Aniversário 05/06 &nbsp;•&nbsp; 🎉 Festa 07/06/2026 &nbsp;•&nbsp; 6 anos
        </small>
      </div>
    </main>
  );
}
