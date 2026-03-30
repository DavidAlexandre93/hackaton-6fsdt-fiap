import { motion } from 'framer-motion';
import styled from 'styled-components';

const Wrapper = styled(motion.section)`
  position: relative;
  overflow: visible;
  background: linear-gradient(150deg, ${({ theme }) => theme.colors.surface}, ${({ theme }) => theme.colors.elevated});
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 22px;
  box-shadow: ${({ theme }) => theme.shadow.intense};
  backdrop-filter: blur(16px);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(120deg, rgba(124, 141, 255, 0.12), transparent 50%, rgba(38, 212, 215, 0.08));
    pointer-events: none;
  }
`;

const Header = styled.header`
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;

  h3 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    letter-spacing: 0.01em;
  }
`;

const Content = styled.div`
  position: relative;
  z-index: 1;
`;

export default function Card({ title, children, action }) {
  return (
    <Wrapper whileHover={{ y: -4, scale: 1.002 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
      <Header>
        <h3>{title}</h3>
        {action}
      </Header>
      <Content>{children}</Content>
    </Wrapper>
  );
}
