import firebase from "firebase/app";
require ("@firebase/firestore");

var firebaseConfig = {
  apiKey: "AIzaSyA4H87oQ1kcPf1W1nb0ew0bh_8f-hLNhto",
  authDomain: "bibliotecaeletronica-64210.firebaseapp.com",
  projectId: "bibliotecaeletronica-64210",
  storageBucket: "bibliotecaeletronica-64210.appspot.com",
  messagingSenderId: "835799415946",
  appId: "1:835799415946:web:1eade34fd2226dc9b60173"
};

firebase.initializeApp(firebaseConfig);

export default firebase.firestore();



