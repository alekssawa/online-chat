// MessageView.tsx
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import MessageBox from "./messageBox/MessageBox";

const GET_MESSAGES = gql`
  query GetMessages($roomId: ID!) {
    messages(roomId: $roomId) {
      id
      text
      sender {
        id
        name
      }
      createdAt
    }
  }
`;

function MessageView({ roomId }) {
  const { data, loading, error } = useQuery(GET_MESSAGES, {
    variables: { roomId },
  });

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p>Ошибка: {error.message}</p>;

  return (
    <div>
      <MessageBox messages={data.messages} />
    </div>
  );
}

export default MessageView;
