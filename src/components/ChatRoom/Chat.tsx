// ChatRoom.tsx
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import {
  fetchMessages,
  sendMessage,
  deleteMessage,
} from "../../features/messagesSlice";
import { AppDispatch, RootState } from "../../app/store";
import { fetchUsers, oneUser } from "../../features/usersSlice";
import styles from "./ChatRoom.module.css";
import { RiChatDeleteLine } from "react-icons/ri";
import { io, Socket } from "socket.io-client";
import moment from "moment-timezone";
moment.tz.setDefault("Europe/Moscow");

function ChatRoom() {
  const { chatId } = useParams<{ chatId: string }>();
  const chat = useSelector((state: RootState) => state.chat);
  const userOne = useSelector((state: RootState) => state.usersSlice.oneUser);
  const dispatch = useDispatch<AppDispatch>();
  const messages = useSelector((state: RootState) => state.messages.messages);
  const [messageInput, setMessageInput] = useState("");
  const users = useSelector((state: RootState) => state.usersSlice.users);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (chatId) {
      dispatch(fetchMessages(chatId));
      dispatch(fetchUsers());
      dispatch(oneUser());
    }

    if (!socket) {
      const newSocket = io("http://localhost:3000"); // Создание экземпляра Socket

      newSocket.on("connect", () => {
        console.log("Connected to WebSocket server");
      });

      newSocket.on("chatMessage", (message) => {
        dispatch(sendMessage(message));
      });

      newSocket.on("messageDeleted", (data) => {
        const { chatId, messageId } = data;
        // Обновите состояние (Redux store) и удалите сообщение по messageId
        dispatch(deleteMessage({ chatId, messageId }));
      });

      setSocket(newSocket); // Сохранение экземпляра Socket в состоянии
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [chatId, dispatch, socket]);

  const sendMessageHandler = () => {
    if (messageInput.trim() && userOne) {
      const newMessage = {
        text: messageInput,
        sender: userOne._id,
        chat: chatId,
      };
      socket?.emit("newMessage", newMessage);
    }

    setMessageInput("");
    
  };

  const deleteMessageHandler = (messageId: string) => {
    if (userOne && chatId) {
      // Отправить событие на сервер для удаления сообщения
      socket?.emit("deleteMessage", { chatId, messageId });
    }
  };

  function getUsernameColor(username: string) {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = "#" + ((hash & 0x00ffffff) | 0x808080).toString(17);
    return color;
  }

 const renderDateLabel = (message, index) => {
    if (index === 0 || moment(messages[index - 1].timestamp, 'HH:mm').day() !== moment(message.timestamp, 'HH:mm').day()) {
      return (
        <div className={styles.messageDay}>
          {moment(message.timestamp, 'HH:mm').calendar(null, {
            sameDay: '[Сегодня]',
            lastDay: '[Вчера]',
            lastWeek: 'DD.MM.YYYY',
            sameElse: 'DD.MM.YYYY',
          })}
        </div>
      );
    }
    return null;
  };

  const formatDate = (timestamp) => {
    const momentTimestamp = moment(timestamp, "HH:mm");
  
    const now = moment();
    const today = moment().startOf('day');
    const yesterday = moment().subtract(1, 'days').startOf('day');
  
    if (momentTimestamp.isSame(now, 'day')) {
      return momentTimestamp.format('HH:mm');
    } else if (momentTimestamp.isSame(yesterday, 'day')) {
      return `вчера, ${momentTimestamp.format('HH:mm')}`;
    } else {
      return momentTimestamp.format('DD.MM.YYYY, HH:mm');
    }
  };

  return (
    <div className={styles.chatRoom}>
      <div className={styles.chatHeader}>Chat Room {chat.chats[0]?.name}</div>
      <div className={styles.chatMessages}>
        {messages.map((message, index) => (
          <div key={message.id} className={styles.message}>
            {renderDateLabel(message, index)}
            {users.map((user) =>
              user._id === message.sender ? (
                <div
                className={styles.userName}
                  key={user._id}
                  style={{ color: getUsernameColor(user.login) }}
                >
                  {user.login}
                </div>
              ) : null
            )}
            <div className={styles.messageText}>{message.text}</div>
            <div className={styles.messageTime}>
              {formatDate(message.timestamp)}
            </div>
            {userOne && userOne._id === message.sender ? (
              <button
                className={styles.deleteButton}
                onClick={() => deleteMessageHandler(message._id)}
              >
                <RiChatDeleteLine />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <div className={styles.chatInput}>
        <input
          type="text"
          placeholder="Напишите сообщение..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
        />
        <button onClick={sendMessageHandler} className={styles.button}>
          Отправить
        </button>
      </div>
    </div>
  );
}

export default ChatRoom;
