// pages/_document.js
import Document, { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

class MyDocument extends Document {
  // eslint-disable-next-line class-methods-use-this
  render() {
    return (
      <Html>
        <Head>
          {/* <!-- Favicon --> */}
          <link href="/favicon.ico" rel="icon" />

          {/* <!-- Google Fonts --> */}
          <link
            href="https://fonts.googleapis.com/css?family=Open+Sans:300,300i,400,400i,600,600i,700,700i|Raleway:300,300i,400,400i,500,500i,600,600i,700,700i|Poppins:300,300i,400,400i,500,500i,600,600i,700,700i&display=optional"
            rel="stylesheet"
          />
        </Head>
        <body>
          <Main />
          {/* <!-- Vendor/Template JS Files (minimal) --> */}
          <Script src="/assets/vendor/bootstrap/js/bootstrap.bundle.min.js"></Script>
          {/* Template main behaviors for navbar/back-to-top */}
          <Script src="/assets/js/main.js"></Script>

          <NextScript />

          {/* AOS is initialized in _app via CSS import and AOS.init() */}
        </body>
      </Html>
    );
  }
}

export default MyDocument;
