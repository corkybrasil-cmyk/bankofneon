const admin = require('firebase-admin');
admin.initializeApp();

const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

const { onDocumentUpdated } = require('firebase-functions/v2/firestore');

exports.versionarFotoAluno = onDocumentUpdated('alunos/{docId}', async (event) => {
  const beforeUrl = event.data.before.data().fotoUrl;
  const afterUrl = event.data.after.data().fotoUrl;
  if (!beforeUrl || beforeUrl === afterUrl) return null;

  const docId = event.params.docId;
  const bucketName = 'crmdaneon.appspot.com';
  const bucket = storage.bucket(bucketName);

  // Descobre o próximo sufixo disponível
  let n = 1;
  let versionedPath;
  while (true) {
    versionedPath = `imagemAlunos/${docId}.${n}`;
    const [exists] = await bucket.file(versionedPath).exists();
    if (!exists) break;
    n++;
  }

  // Copia a foto antiga para o arquivo versionado
  await bucket.file(`imagemAlunos/${docId}`).copy(bucket.file(versionedPath));
  console.log(`Backup criado: ${versionedPath}`);
  return null;
});