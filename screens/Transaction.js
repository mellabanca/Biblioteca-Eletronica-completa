import React, { Component } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ImageBackground, Image, KeyboardAvoidingView, Alert, ToastAndroid } from "react-native";
import * as Permissions from "expo-permissions";
import { BarCodeScanner } from "expo-barcode-scanner";
import db from "../config";
import firebase from "firebase";

const bgImage = require("../assets/background2.png");
const appIcon = require("../assets/appIcon.png");
const appName = require("../assets/appName.png");

export default class TransactionScreen extends Component {
  constructor(props) {
    super(props);
      this.state = {
      domState: "normal",
      hasCameraPermissions: null,
      scanned: false,
      scannedData: "",
      bookId: "",
      studenId: "",
      bookName:"",
      studentName:""
    };
  }

  getCameraPermissions = async domState => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);

    this.setState({
      /*status === "granted" é verdadeiro se o usuário concedeu permissão
        status === "granted" é falso se o usuário não concedeu permissão
      */
      hasCameraPermissions: status === "granted",
      domState: domState,
      scanned: false
    });
  };

  handleBarCodeScanned = async ({ type, data }) => {
    const { domState } = this.state;
    if(domState === "bookId"){
      this.setState({
        bookId: data,
        domState: "normal",
        scanned: true
      });
    } else if (domState === "studentId"){
      this.setState({
        studentId: data,
        domState: "normal",
        scanned: true
      });
    }
  };

  handleTransaction = async () => {
    var { bookId, studentId } = this.state;
    await this.getBookDetails(bookId);
    await this.getStudentDetails(studentId);

    var transactionType = await this.checkBookAvailability(bookId);

    if(!transactionType){
      this.setState({bookId: "", studentId: ""});
      Alert.alert("O livro não existe no banco de dados da biblioteca!");
    } else if(transactionType === "issue"){
      var isEligible = await this.checkStudentEligibilityForBookIssue(studentId);
      if(isEligible){
        var { bookName, studentName } = this.state;
        this.initiateBookIssue(bookId, studentId, bookName, studentName);
      }  
        Alert.alert("Livro entregue para o aluno!");  
    } else {
      var isEligible = await this.checkStudentEligibilityForBookReturn(bookId,studentId);
      if(isEligible){
        var { bookName, studentName } = this.state;
        this.initiateBookReturn(bookId, studentId, bookName, studentName);
      }  
        Alert.alert("Livro retornado à biblioteca!");
      }
    }
  

  initiateBookIssue = async (bookId, studentId, bookName, studentName) => {
    //adicionar uma transação
    db.collection("transactions").add({
      student_id: studentId,
      student_name: studentName,
      book_id: bookId,
      book_name: bookName,
      date: firebase.firestore.Timestamp.now().toDate(),
      transaction_type: "issue"
    });
    //alterar status do livro
    db.collection("books")
    .doc(bookId)
    .update({
      is_book_available: false
    });
    //alterar o número de livros retirados pelo aluno
    db.collection("students")
    .doc(studentId)
    .update({
      number_of_books_issued: firebase.firestore.FieldValue.increment(1)
    });
    //atualizando o estado local
    this.setState({
      bookId: "",
      studentId: ""
    });
  }

  initiateBookReturn = async (bookId, studentId, bookName, studentName) => {
    //adicionar uma transação
    db.collection("transactions").add({
      student_id: studentId,
      student_name: studentName,
      book_id: bookId,
      book_name: bookName,
      date: firebase.firestore.Timestamp.now().toDate(),
      transaction_type: "return"
    });
    //alterar status do livro
    db.collection("books")
    .doc(bookId)
    .update({
      is_book_available: true
    });
    //alterar o número de livros retirados pelo aluno
    db.collection("students")
    .doc(studentId)
    .update({
      number_of_books_issued: firebase.firestore.FieldValue.increment(-1)
    });
    //atualizando o estado local
    this.setState({
      bookId: "",
      studentId: ""
    });
  }

  getBookDetails = bookId => {
    bookId = bookId.trim();
    db.collection("books")
    .where("book_id","==",bookId)
    .get()
    .then(snapshot => {
      snapshot.docs.map(doc => {
        this.setState({
        bookName: doc.data().book_name
        })
      })
    })
  }

  getStudentDetails = studentId => {
    studentId = studentId.trim();
    db.collection("students")
    .where("student_id","==",studentId)
    .get()
    .then(snapshot => {
      snapshot.docs.map(doc => {
        this.setState({
        studentName: doc.data().student_name
        })
      })
    })
  }

  checkBookAvailability = async bookId => {
    const bookRef = await db
    .collection("books")
    .where("book_id","==",bookId)
    .get();

    var transactionType = "";
    if(bookRef.docs.length == 0) {
      transactionType = false;
    } else {
      bookRef.docs.map(doc => {
        //se o livro estiver disponível, o tipo de transação será issue (entregar)
        //caso contrário, será return (devolver)
        transactionType = doc.data().is_book_available ? "issue" : "return";
      });
    }
    return transactionType;
  }

  checkStudentEligibilityForBookIssue = async studentId => {
    const studentRef = await db
    .collection("students")
    .where("student_id","==",studentId)
    .get();

    var isStudentEligible = "";
    if(studentRef.docs.length == 0){
      this.setState({
        bookId: "",
        studentId: ""
      });
      isStudentEligible = false;
      Alert.alert("O id do aluno não existe no banco de dados!");
    } else {
      studentRef.docs.map(doc => {
        if(doc.data().number_of_books_issued < 2) {
          isStudentEligible = true;
        } else {
          isStudentEligible = false;
          Alert.alert("O aluno já retirou 2 livros!");
          this.setState({
            bookId: "",
            studentId: ""
          });
        }
      });
    }
    return isStudentEligible;
  }

  checkStudentEligibilityForBookReturn = async (bookId, studentId) => {
    const transactionRef = await db
    .collection("transactions")
    .where("book_id","==",bookId)
    .limit(1)
    .get();

    var isStudentEligible = "";
    transactionRef.docs.map(doc =>{
      var lastBookTransaction = doc.data();
      if(lastBookTransaction.student_id === studentId){
        isStudentEligible = true;
      } else {
        isStudentEligible = false;
        Alert.alert("O livro não foi retirado por este aluno!");
        this.setState({
          bookId: "",
          studentId: ""
        });
      }
    });
    return isStudentEligible;
  };


  render() {  
    const { bookId, studentId, domState, hasCameraPermissions, scannedData, scanned } = this.state;
    if (domState !== "normal") {
      return (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
      );
    }

    return (
      <KeyboardAvoidingView behavior="padding" style = {styles.container}>
        <ImageBackground source={bgImage} style={styles.bgImage}>
          <View style={styles.upperContainer}>
            <Image source={appIcon} style={styles.appIcon}/>
            <Image source={appName} style={styles.appName}/>
          </View>
        <View style={styles.lowerContainer}>
          <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder={"Id livro"}
                placeholderTextColor={"#FFFFFF"}
                value={bookId}
                onChangeText={text => this.setState({ bookId: text})}
                />
              <TouchableOpacity
                style={styles.scanbutton}
                onPress={()=>this.getCameraPermissions("bookId")}
              >
              <Text style={styles.scanButtonText}>Digitalizar</Text>
              </TouchableOpacity>
          </View>
          <View style={[styles.textInputContainer,{marginTop: 25}]}>
              <TextInput
                style={styles.textInput}
                placeholder={"Id aluno"}
                placeholderTextColor={"#FFFFFF"}
                value={studentId}
                onChangeText={text => this.setState({ studentId: text})}
                />
              <TouchableOpacity
                style={styles.scanbutton}
                onPress={()=>this.getCameraPermissions("studentId")}
              >
              <Text style={styles.scanButtonText}>Digitalizar</Text>
              </TouchableOpacity>
          </View>
          <TouchableOpacity
          style={[styles.button, {marginTop: 25}]}
          onPress={this.handleTransaction}
          >
            <Text style={styles.buttonText}>Enviar</Text>
          </TouchableOpacity>
        </View>
        </ImageBackground>
        </KeyboardAvoidingView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#5653D4"
  },
  text: {
    color: "#ffff",
    fontSize: 15
  },
  button: {
    width: "43%",
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F48D20",
    borderRadius: 15
  },
  buttonText: {
    fontSize: 15,
    color: "#FFFFFF"
  },
  lowerContainer: {
    flex: 0.5,
    alignItems: "center"
  },
  textInputContainer: {
    borderWidth: 2,
    borderRadius: 10,
    flexDirection: "row",
    backgroundColor: "#9DFD24",
    borderColor: "#FFFFFF"
  },
  textInput: {
    width: "57%",
    height: 50,
    padding: 10,
    borderColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 3,
    fontSize: 18,
    backgroundColor: "#5653D4",
    fontFamily: "Rajdhani_600SemiBold",
    color: "#FFFFFF"
  },
  scanbutton: {
    width: 100,
    height: 50,
    backgroundColor: "#9DFD24",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    justifyContent: "center",
    alignItems: "center"
  },
  scanButtonText: {
    fontSize: 20,
    color: "#0A0101",
    fontFamily: "Rajdhani_600SemiBold"
  },
  bgImage: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center"
  },
  upperContainer: {
    flex: 0.5,
    justifyContent: "center",
    alignItems: "center"
  },
  appIcon: {
    width: 200,
    height: 200,
    resizeMode: "contain",
    marginTop: 80
  },
  appName: {
    width: 180,
    resizeMode: "contain"
  },
});
