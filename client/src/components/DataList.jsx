import { motion } from 'framer-motion';
import styled from 'styled-components';

const List = styled.ul`
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
`;

const Item = styled(motion.li)`
  position: relative;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 14px;
  background: linear-gradient(160deg, rgba(6, 12, 30, 0.88), rgba(16, 26, 52, 0.9));
  box-shadow: ${({ theme }) => theme.shadow.soft};

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.muted};
    font-size: 0.92rem;
    line-height: 1.45;

    + p {
      margin-top: 4px;
    }
  }

  strong {
    color: ${({ theme }) => theme.colors.text};
    font-weight: 650;
  }
`;

const Empty = styled.p`
  margin: 4px 0 0;
  color: ${({ theme }) => theme.colors.muted};
`;

const ActionBox = styled.div`
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export default function DataList({ items, fields, actions }) {
  if (!items.length) {
    return <Empty>Nenhum registro encontrado.</Empty>;
  }

  return (
    <List>
      {items.map((item, index) => (
        <Item
          key={item.id || `${item.title}-${item.subject}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: index * 0.03 }}
          whileHover={{ y: -2 }}
        >
          {fields.map((field) => (
            <p key={field.key}>
              <strong>{field.label}:</strong> {item[field.key] || '-'}
            </p>
          ))}
          {actions && <ActionBox>{actions(item)}</ActionBox>}
        </Item>
      ))}
    </List>
  );
}
