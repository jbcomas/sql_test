require("dotenv").config();
const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const mysql = require('mysql2/promise');

// Definición del esquema GraphQL
const typeDefs = gql`
  type Query {
    executeSQL(database: String!, sql: String!): [GenericRow]
  }

  type GenericRow {
    fields: [Field]
  }

  type Field {
    name: String
    value: String
  }
`;

// Definición de los resolvers
const resolvers = {
  Query: {
    executeSQL: async (_, { database, sql }) => {
      try {
        const dbConfig = {
          host: process.env.DATABASE_HOST_AWS,
          user: process.env.MYSQL_USER,
          password: process.env.MYSQL_PASSWORD,
          database
        };

        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(sql);

        await connection.end();

        // Formatear los resultados para GraphQL
        return rows.map(row => {
          const fields = Object.entries(row).map(([key, value]) => ({
            name: key,
            value: Buffer.isBuffer(value) ? value.toString('utf8') : String(value)
          }));
          return { fields };
        });
      } catch (err) {
        throw new Error(`Error ejecutando la consulta: ${err.message}`);
      }
    }
  }
};

// Inicializa el servidor Apollo
const server = new ApolloServer({ typeDefs, resolvers });

// Inicializa la aplicación Express
const app = express();
server.start().then(() => {
  server.applyMiddleware({ app });

  // Inicia el servidor
  app.listen({ port: 4000 }, () => {
    console.log(`Servidor listo en http://localhost:4000${server.graphqlPath}`);
  });
});
