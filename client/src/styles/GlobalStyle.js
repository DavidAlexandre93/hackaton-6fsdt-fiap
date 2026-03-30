import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    min-height: 100%;
  }

  :root {
    font-family: 'Inter', 'Plus Jakarta Sans', 'Segoe UI', system-ui, -apple-system, sans-serif;
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.bg};
    text-rendering: geometricPrecision;
    -webkit-font-smoothing: antialiased;
  }

  body {
    margin: 0;
    background:
      radial-gradient(circle at 18% -12%, rgba(124, 141, 255, 0.35), transparent 35%),
      radial-gradient(circle at 88% 10%, rgba(38, 212, 215, 0.24), transparent 42%),
      radial-gradient(circle at 50% 100%, rgba(185, 131, 255, 0.2), transparent 50%),
      linear-gradient(170deg, ${({ theme }) => theme.colors.bg} 0%, ${({ theme }) => theme.colors.bgSecondary} 45%, #04060f 100%);
    color: ${({ theme }) => theme.colors.text};
  }

  a {
    color: inherit;
  }

  button,
  input,
  select,
  textarea {
    font: inherit;
    color: inherit;
  }

  ::selection {
    background: rgba(124, 141, 255, 0.42);
    color: ${({ theme }) => theme.colors.text};
  }
`;

export default GlobalStyle;
