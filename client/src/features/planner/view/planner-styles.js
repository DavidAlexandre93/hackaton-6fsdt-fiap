import { motion } from 'framer-motion';
import styled from 'styled-components';

export const Container = styled.main`
  max-width: 1280px;
  margin: 0 auto;
  padding: 30px 24px 40px;
`;

export const Hero = styled(motion.section)`
  position: relative;
  margin-bottom: 22px;
  padding: 30px;
  border-radius: ${({ theme }) => theme.radius.xl};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background:
    linear-gradient(160deg, rgba(16, 33, 80, 0.95), rgba(7, 16, 34, 0.95)),
    radial-gradient(circle at top right, rgba(38, 212, 215, 0.25), transparent 45%);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    width: 240px;
    height: 240px;
    right: -80px;
    top: -80px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(124, 141, 255, 0.42), transparent 68%);
    pointer-events: none;
  }

  h1 {
    margin: 0 0 10px;
    font-size: clamp(1.8rem, 2.6vw, 2.45rem);
    letter-spacing: -0.01em;
    position: relative;
    z-index: 1;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.muted};
    max-width: 860px;
    position: relative;
    z-index: 1;
  }
`;

export const Grid = styled.section`
  display: grid;
  gap: 16px;
  grid-template-columns: 1.06fr 0.94fr 1.08fr;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

export const Form = styled.form`
  display: grid;
  gap: 12px;
`;

const controlStyles = ({ theme }) => `
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius.md};
  padding: 11px 12px;
  background: rgba(3, 9, 24, 0.7);
  color: ${theme.colors.text};
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;

  &::placeholder {
    color: ${theme.colors.muted};
  }

  &:focus {
    border-color: rgba(124, 141, 255, 0.65);
    box-shadow: 0 0 0 3px rgba(124, 141, 255, 0.2);
    transform: translateY(-1px);
  }
`;

export const Input = styled.input`
  ${({ theme }) => controlStyles({ theme })}
`;

export const TextArea = styled.textarea`
  ${({ theme }) => controlStyles({ theme })}
  min-height: 92px;
  resize: vertical;
`;

export const Select = styled.select`
  ${({ theme }) => controlStyles({ theme })}
`;

export const FormGrid = styled.div`
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const Button = styled(motion.button)`
  border: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ variant }) =>
    variant === 'ghost'
      ? 'rgba(255, 255, 255, 0.08)'
      : variant === 'danger'
        ? 'linear-gradient(120deg, #ff6a8b, #ca345a)'
        : 'linear-gradient(120deg, #7c8dff, #26d4d7)'};
  color: #fff;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
  width: ${({ full }) => (full ? '100%' : 'auto')};
  box-shadow: ${({ variant }) => (variant === 'ghost' ? 'none' : '0 10px 22px rgba(12, 22, 50, 0.4)')};
  letter-spacing: 0.01em;
`;

export const Metrics = styled.div`
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
`;

export const Metric = styled(motion.div)`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px;
  background: rgba(5, 10, 28, 0.62);

  span {
    display: block;
    color: ${({ theme }) => theme.colors.muted};
    font-size: 0.85rem;
  }

  strong {
    display: block;
    font-size: 1.32rem;
    margin-top: 6px;
  }
`;

export const FilterRow = styled.div`
  display: grid;
  gap: 8px;
  grid-template-columns: 1.5fr 1fr 1fr;
  margin-bottom: 10px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

export const SectionTitle = styled.h4`
  margin: 14px 0 8px;
  font-size: 1rem;
`;

export const Warning = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.warning};
  font-weight: 600;
`;

export const Muted = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
`;

export const OfflineBadge = styled.div`
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(255, 184, 0, 0.15);
  color: ${({ theme }) => theme.colors.warning};
  font-weight: 600;
`;
