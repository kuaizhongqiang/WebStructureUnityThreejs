using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using WSU3.Contracts;
using WSU3.Core.Interfaces;

namespace WSU3.Core.Models
{
    [Serializable]
    public class QuestionData
    {
        public List<QuestionClip> clips = new List<QuestionClip>();
        public QuestionClip GetQuestionClip(string id)
        {
            foreach (var clip in clips)
            {
                if (clip.id == id)
                {
                    return clip;
                }
            }
            return null;
        }

        public QuestionClip GetQuestionClip(int index)
        {
            if (index < clips.Count)
            {
                return clips[index];
            }
            return null;
        }
    
        public List<QuestionClip> GetQuestionClips(List<string> ids)
        {
            List<QuestionClip> questionClips = new List<QuestionClip>();
            foreach (var id in ids)
            {
                var questionClip = GetQuestionClip(id);
                if (questionClip != null)
                {
                    questionClips.Add(questionClip);
                }
            }
            return questionClips;
        }
    }
    [Serializable]
    public class QuestionClip : DataBase, IDataJson
    {
        public QuestionType questionType;
        public string question;
        public List<QuestionOption> options = new List<QuestionOption>();
        public string tips;
    }
    [Serializable]
    public struct QuestionOption
    {
        public string option;
        public bool isCorrect;
    }
    
}
