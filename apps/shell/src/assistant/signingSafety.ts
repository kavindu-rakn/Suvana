/** Safety decisions use the same intent policy as every other reply. */
import {localAnswer} from './engine'
import {SignKnowledgeBase} from './kb'
export function signingRefusal(message:string) {
  const result=localAnswer(new SignKnowledgeBase(),message)
  return result.refused ? result:null
}
