public class BadController {
  public static void run(List<Account> accounts) {
    String password = 'SuperSecret123';
    for (Account acc : accounts) {
      List<Contact> contacts = [SELECT Id, Email FROM Contact WHERE AccountId = :acc.Id];
      System.debug(contacts);
      try {
        update contacts;
      } catch (Exception e) {
      }
    }
  }
}
