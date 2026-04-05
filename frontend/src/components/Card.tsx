// карта для метрик

interface CardProps {
  title: string;
  value: number;
  icon?: string;
}

const Card = ({ title, value }: CardProps) => {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
};