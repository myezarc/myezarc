export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      Achievement: {
        Row: {
          achievementKey: string
          earnedAt: string
          id: string
          userId: string
        }
        Insert: {
          achievementKey: string
          earnedAt?: string
          id: string
          userId: string
        }
        Update: {
          achievementKey?: string
          earnedAt?: string
          id?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Achievement_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      application_files: {
        Row: {
          application_id: string
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_files_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          application_pdf_path: string | null
          created_at: string
          description: string | null
          extracted_text: string | null
          hoa_id: string
          homeowner_email: string | null
          homeowner_id: string
          id: string
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string
          title: string
          updated_at: string
        }
        Insert: {
          application_pdf_path?: string | null
          created_at?: string
          description?: string | null
          extracted_text?: string | null
          hoa_id: string
          homeowner_email?: string | null
          homeowner_id: string
          id?: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          application_pdf_path?: string | null
          created_at?: string
          description?: string | null
          extracted_text?: string | null
          hoa_id?: string
          homeowner_email?: string | null
          homeowner_id?: string
          id?: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_hoa_id_fkey"
            columns: ["hoa_id"]
            isOneToOne: false
            referencedRelation: "hoas"
            referencedColumns: ["id"]
          },
        ]
      }
      arc_reviews: {
        Row: {
          application_id: string
          created_at: string
          decision: Database["public"]["Enums"]["review_decision"]
          findings: Json | null
          form_section: Json | null
          homeowner_message: string | null
          id: string
          is_final: boolean
          model: string | null
          reviewer_id: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          decision: Database["public"]["Enums"]["review_decision"]
          findings?: Json | null
          form_section?: Json | null
          homeowner_message?: string | null
          id?: string
          is_final?: boolean
          model?: string | null
          reviewer_id?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          decision?: Database["public"]["Enums"]["review_decision"]
          findings?: Json | null
          form_section?: Json | null
          homeowner_message?: string | null
          id?: string
          is_final?: boolean
          model?: string | null
          reviewer_id?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arc_reviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      BadgeCatalog: {
        Row: {
          category: string
          condition: string
          description: string
          icon: string
          id: string
          key: string
          name: string
        }
        Insert: {
          category: string
          condition: string
          description: string
          icon: string
          id: string
          key: string
          name: string
        }
        Update: {
          category?: string
          condition?: string
          description?: string
          icon?: string
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      Bookmark: {
        Row: {
          createdAt: string
          id: string
          satQuestionId: string
          userId: string
        }
        Insert: {
          createdAt?: string
          id: string
          satQuestionId: string
          userId: string
        }
        Update: {
          createdAt?: string
          id?: string
          satQuestionId?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Bookmark_satQuestionId_fkey"
            columns: ["satQuestionId"]
            isOneToOne: false
            referencedRelation: "SATQuestion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Bookmark_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Challenge: {
        Row: {
          createdAt: string
          creatorId: string
          difficulty: string
          expiresAt: string
          id: string
          questionCount: number
          questionIds: Json
          status: string
          subject: string
          timeLimitMin: number
          title: string
          topicId: string | null
        }
        Insert: {
          createdAt?: string
          creatorId: string
          difficulty: string
          expiresAt: string
          id: string
          questionCount?: number
          questionIds: Json
          status?: string
          subject: string
          timeLimitMin?: number
          title: string
          topicId?: string | null
        }
        Update: {
          createdAt?: string
          creatorId?: string
          difficulty?: string
          expiresAt?: string
          id?: string
          questionCount?: number
          questionIds?: Json
          status?: string
          subject?: string
          timeLimitMin?: number
          title?: string
          topicId?: string | null
        }
        Relationships: []
      }
      ChallengeParticipant: {
        Row: {
          challengeId: string
          completedAt: string | null
          correct: number
          id: string
          rank: number | null
          score: number | null
          timeSpentSec: number
          total: number
          userId: string
          xpEarned: number
        }
        Insert: {
          challengeId: string
          completedAt?: string | null
          correct?: number
          id: string
          rank?: number | null
          score?: number | null
          timeSpentSec?: number
          total?: number
          userId: string
          xpEarned?: number
        }
        Update: {
          challengeId?: string
          completedAt?: string | null
          correct?: number
          id?: string
          rank?: number | null
          score?: number | null
          timeSpentSec?: number
          total?: number
          userId?: string
          xpEarned?: number
        }
        Relationships: [
          {
            foreignKeyName: "ChallengeParticipant_challengeId_fkey"
            columns: ["challengeId"]
            isOneToOne: false
            referencedRelation: "Challenge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ChallengeParticipant_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Conversation: {
        Row: {
          createdAt: string
          id: string
          name: string | null
          type: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          id: string
          name?: string | null
          type?: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          id?: string
          name?: string | null
          type?: string
          updatedAt?: string
        }
        Relationships: []
      }
      ConversationMessage: {
        Row: {
          content: string
          conversationId: string
          createdAt: string
          id: string
          senderId: string
        }
        Insert: {
          content: string
          conversationId: string
          createdAt?: string
          id: string
          senderId: string
        }
        Update: {
          content?: string
          conversationId?: string
          createdAt?: string
          id?: string
          senderId?: string
        }
        Relationships: [
          {
            foreignKeyName: "ConversationMessage_conversationId_fkey"
            columns: ["conversationId"]
            isOneToOne: false
            referencedRelation: "Conversation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ConversationMessage_senderId_fkey"
            columns: ["senderId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      ConversationParticipant: {
        Row: {
          conversationId: string
          id: string
          joinedAt: string
          lastReadAt: string | null
          status: string
          userId: string
        }
        Insert: {
          conversationId: string
          id: string
          joinedAt?: string
          lastReadAt?: string | null
          status?: string
          userId: string
        }
        Update: {
          conversationId?: string
          id?: string
          joinedAt?: string
          lastReadAt?: string | null
          status?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "ConversationParticipant_conversationId_fkey"
            columns: ["conversationId"]
            isOneToOne: false
            referencedRelation: "Conversation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ConversationParticipant_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      DailyActivity: {
        Row: {
          date: string
          elaTimeSec: number
          id: string
          mathTimeSec: number
          questionsAttempted: number
          questionsCorrect: number
          sessionsCount: number
          studyTimeSec: number
          userId: string
          xpEarned: number
        }
        Insert: {
          date: string
          elaTimeSec?: number
          id: string
          mathTimeSec?: number
          questionsAttempted?: number
          questionsCorrect?: number
          sessionsCount?: number
          studyTimeSec?: number
          userId: string
          xpEarned?: number
        }
        Update: {
          date?: string
          elaTimeSec?: number
          id?: string
          mathTimeSec?: number
          questionsAttempted?: number
          questionsCorrect?: number
          sessionsCount?: number
          studyTimeSec?: number
          userId?: string
          xpEarned?: number
        }
        Relationships: [
          {
            foreignKeyName: "DailyActivity_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      DailyQuestCatalog: {
        Row: {
          description: string
          id: string
          key: string
          questType: string
          rewardCoins: number
          rewardXP: number
          targetValue: number
          title: string
        }
        Insert: {
          description: string
          id: string
          key: string
          questType: string
          rewardCoins?: number
          rewardXP: number
          targetValue: number
          title: string
        }
        Update: {
          description?: string
          id?: string
          key?: string
          questType?: string
          rewardCoins?: number
          rewardXP?: number
          targetValue?: number
          title?: string
        }
        Relationships: []
      }
      EarnedBadge: {
        Row: {
          badgeKey: string
          earnedAt: string
          id: string
          userId: string
        }
        Insert: {
          badgeKey: string
          earnedAt?: string
          id: string
          userId: string
        }
        Update: {
          badgeKey?: string
          earnedAt?: string
          id?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "EarnedBadge_badgeKey_fkey"
            columns: ["badgeKey"]
            isOneToOne: false
            referencedRelation: "BadgeCatalog"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "EarnedBadge_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      FriendConnection: {
        Row: {
          createdAt: string
          id: string
          receiverId: string
          requesterId: string
          status: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          id: string
          receiverId: string
          requesterId: string
          status?: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          id?: string
          receiverId?: string
          requesterId?: string
          status?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "FriendConnection_receiverId_fkey"
            columns: ["receiverId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "FriendConnection_requesterId_fkey"
            columns: ["requesterId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      GameProfile: {
        Row: {
          coins: number
          level: number
          monthlyXP: number
          monthlyXPReset: string | null
          privacySetting: string
          totalXP: number
          updatedAt: string
          userId: string
          username: string
          weeklyXP: number
          weeklyXPReset: string | null
        }
        Insert: {
          coins?: number
          level?: number
          monthlyXP?: number
          monthlyXPReset?: string | null
          privacySetting?: string
          totalXP?: number
          updatedAt: string
          userId: string
          username: string
          weeklyXP?: number
          weeklyXPReset?: string | null
        }
        Update: {
          coins?: number
          level?: number
          monthlyXP?: number
          monthlyXPReset?: string | null
          privacySetting?: string
          totalXP?: number
          updatedAt?: string
          userId?: string
          username?: string
          weeklyXP?: number
          weeklyXPReset?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "GameProfile_userId_fkey"
            columns: ["userId"]
            isOneToOne: true
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      hoa_forms: {
        Row: {
          created_at: string
          hoa_id: string
          id: string
          is_active: boolean
          storage_path: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          hoa_id: string
          id?: string
          is_active?: boolean
          storage_path: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          hoa_id?: string
          id?: string
          is_active?: boolean
          storage_path?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hoa_forms_hoa_id_fkey"
            columns: ["hoa_id"]
            isOneToOne: false
            referencedRelation: "hoas"
            referencedColumns: ["id"]
          },
        ]
      }
      hoa_guidelines: {
        Row: {
          created_at: string
          extracted_text: string | null
          hoa_id: string
          id: string
          is_active: boolean
          storage_path: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          hoa_id: string
          id?: string
          is_active?: boolean
          storage_path: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          hoa_id?: string
          id?: string
          is_active?: boolean
          storage_path?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hoa_guidelines_hoa_id_fkey"
            columns: ["hoa_id"]
            isOneToOne: false
            referencedRelation: "hoas"
            referencedColumns: ["id"]
          },
        ]
      }
      hoa_memberships: {
        Row: {
          city: string
          created_at: string
          email: string
          hoa_id: string
          id: string
          note: string | null
          phone: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: string
          status: Database["public"]["Enums"]["membership_status"]
          street_address: string
          unit: string | null
          updated_at: string
          user_id: string
          zip: string
        }
        Insert: {
          city: string
          created_at?: string
          email: string
          hoa_id: string
          id?: string
          note?: string | null
          phone: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state: string
          status?: Database["public"]["Enums"]["membership_status"]
          street_address: string
          unit?: string | null
          updated_at?: string
          user_id: string
          zip: string
        }
        Update: {
          city?: string
          created_at?: string
          email?: string
          hoa_id?: string
          id?: string
          note?: string | null
          phone?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string
          status?: Database["public"]["Enums"]["membership_status"]
          street_address?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "hoa_memberships_hoa_id_fkey"
            columns: ["hoa_id"]
            isOneToOne: false
            referencedRelation: "hoas"
            referencedColumns: ["id"]
          },
        ]
      }
      hoas: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      Message: {
        Row: {
          content: string
          createdAt: string
          id: string
          role: string
          sessionId: string
        }
        Insert: {
          content: string
          createdAt?: string
          id: string
          role: string
          sessionId: string
        }
        Update: {
          content?: string
          createdAt?: string
          id?: string
          role?: string
          sessionId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Message_sessionId_fkey"
            columns: ["sessionId"]
            isOneToOne: false
            referencedRelation: "StudySession"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          application_id: string
          body: string
          created_at: string
          id: string
          is_system: boolean
          sender_id: string
        }
        Insert: {
          application_id: string
          body: string
          created_at?: string
          id?: string
          is_system?: boolean
          sender_id: string
        }
        Update: {
          application_id?: string
          body?: string
          created_at?: string
          id?: string
          is_system?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      ParentStudentLink: {
        Row: {
          createdAt: string
          id: string
          parentId: string
          studentId: string
        }
        Insert: {
          createdAt?: string
          id: string
          parentId: string
          studentId: string
        }
        Update: {
          createdAt?: string
          id?: string
          parentId?: string
          studentId?: string
        }
        Relationships: [
          {
            foreignKeyName: "ParentStudentLink_parentId_fkey"
            columns: ["parentId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ParentStudentLink_studentId_fkey"
            columns: ["studentId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      PointTransaction: {
        Row: {
          actionType: string
          coinsAwarded: number
          createdAt: string
          id: string
          relatedId: string | null
          userId: string
          xpAwarded: number
        }
        Insert: {
          actionType: string
          coinsAwarded?: number
          createdAt?: string
          id: string
          relatedId?: string | null
          userId: string
          xpAwarded?: number
        }
        Update: {
          actionType?: string
          coinsAwarded?: number
          createdAt?: string
          id?: string
          relatedId?: string | null
          userId?: string
          xpAwarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "PointTransaction_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      PracticeAttempt: {
        Row: {
          attemptedAt: string
          explanationViewed: boolean
          id: string
          isCorrect: boolean
          markedForReview: boolean
          masteredAt: string | null
          satQuestionId: string
          selectedAnswer: string | null
          sessionId: string
          timeSpentSec: number
          userId: string
        }
        Insert: {
          attemptedAt?: string
          explanationViewed?: boolean
          id: string
          isCorrect: boolean
          markedForReview?: boolean
          masteredAt?: string | null
          satQuestionId: string
          selectedAnswer?: string | null
          sessionId: string
          timeSpentSec?: number
          userId: string
        }
        Update: {
          attemptedAt?: string
          explanationViewed?: boolean
          id?: string
          isCorrect?: boolean
          markedForReview?: boolean
          masteredAt?: string | null
          satQuestionId?: string
          selectedAnswer?: string | null
          sessionId?: string
          timeSpentSec?: number
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "PracticeAttempt_satQuestionId_fkey"
            columns: ["satQuestionId"]
            isOneToOne: false
            referencedRelation: "SATQuestion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "PracticeAttempt_sessionId_fkey"
            columns: ["sessionId"]
            isOneToOne: false
            referencedRelation: "PracticeSession"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "PracticeAttempt_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      PracticeSession: {
        Row: {
          completed: boolean
          correct: number
          difficulty: string | null
          endedAt: string | null
          id: string
          startedAt: string
          subject: string
          topicId: string | null
          totalQ: number
          userId: string
        }
        Insert: {
          completed?: boolean
          correct?: number
          difficulty?: string | null
          endedAt?: string | null
          id: string
          startedAt?: string
          subject: string
          topicId?: string | null
          totalQ: number
          userId: string
        }
        Update: {
          completed?: boolean
          correct?: number
          difficulty?: string | null
          endedAt?: string | null
          id?: string
          startedAt?: string
          subject?: string
          topicId?: string | null
          totalQ?: number
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "PracticeSession_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          full_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      QuestionAttempt: {
        Row: {
          attemptedAt: string
          difficulty: string
          id: string
          isCorrect: boolean
          sessionId: string
          subject: string
          subtopicLabel: string | null
          topicId: string
          userId: string
          xpEarned: number
        }
        Insert: {
          attemptedAt?: string
          difficulty: string
          id: string
          isCorrect: boolean
          sessionId: string
          subject: string
          subtopicLabel?: string | null
          topicId: string
          userId: string
          xpEarned?: number
        }
        Update: {
          attemptedAt?: string
          difficulty?: string
          id?: string
          isCorrect?: boolean
          sessionId?: string
          subject?: string
          subtopicLabel?: string | null
          topicId?: string
          userId?: string
          xpEarned?: number
        }
        Relationships: [
          {
            foreignKeyName: "QuestionAttempt_sessionId_fkey"
            columns: ["sessionId"]
            isOneToOne: false
            referencedRelation: "StudySession"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "QuestionAttempt_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      SATQuestion: {
        Row: {
          choiceA: string
          choiceB: string
          choiceC: string
          choiceD: string | null
          correctAnswer: string
          createdAt: string
          difficulty: string
          explanation: string
          hasImage: boolean
          id: string
          passage: string | null
          question: string
          questionNum: number
          sourceFile: string
          subject: string
          subtopic: string | null
          topicId: string
        }
        Insert: {
          choiceA: string
          choiceB: string
          choiceC: string
          choiceD?: string | null
          correctAnswer: string
          createdAt?: string
          difficulty: string
          explanation: string
          hasImage?: boolean
          id: string
          passage?: string | null
          question: string
          questionNum: number
          sourceFile: string
          subject: string
          subtopic?: string | null
          topicId: string
        }
        Update: {
          choiceA?: string
          choiceB?: string
          choiceC?: string
          choiceD?: string | null
          correctAnswer?: string
          createdAt?: string
          difficulty?: string
          explanation?: string
          hasImage?: boolean
          id?: string
          passage?: string | null
          question?: string
          questionNum?: number
          sourceFile?: string
          subject?: string
          subtopic?: string | null
          topicId?: string
        }
        Relationships: []
      }
      ScoreEntry: {
        Row: {
          createdAt: string
          id: string
          mathScore: number
          notes: string | null
          rwScore: number
          testDate: string
          testName: string | null
          testType: string
          totalScore: number
          userId: string
        }
        Insert: {
          createdAt?: string
          id: string
          mathScore: number
          notes?: string | null
          rwScore: number
          testDate: string
          testName?: string | null
          testType: string
          totalScore: number
          userId: string
        }
        Update: {
          createdAt?: string
          id?: string
          mathScore?: number
          notes?: string | null
          rwScore?: number
          testDate?: string
          testName?: string | null
          testType?: string
          totalScore?: number
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "ScoreEntry_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Streak: {
        Row: {
          current: number
          id: string
          lastStudied: string | null
          longest: number
          userId: string
        }
        Insert: {
          current?: number
          id: string
          lastStudied?: string | null
          longest?: number
          userId: string
        }
        Update: {
          current?: number
          id?: string
          lastStudied?: string | null
          longest?: number
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Streak_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      StudentDailyQuest: {
        Row: {
          assignedAt: string
          claimedAt: string | null
          completedAt: string | null
          id: string
          progress: number
          questKey: string
          status: string
          userId: string
        }
        Insert: {
          assignedAt: string
          claimedAt?: string | null
          completedAt?: string | null
          id: string
          progress?: number
          questKey: string
          status?: string
          userId: string
        }
        Update: {
          assignedAt?: string
          claimedAt?: string | null
          completedAt?: string | null
          id?: string
          progress?: number
          questKey?: string
          status?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "StudentDailyQuest_questKey_fkey"
            columns: ["questKey"]
            isOneToOne: false
            referencedRelation: "DailyQuestCatalog"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "StudentDailyQuest_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      StudyContentCache: {
        Row: {
          content: Json
          createdAt: string
          difficulty: string
          id: string
          mode: string
          subject: string
          toolType: string
          topicLabel: string
          updatedAt: string
          userId: string
        }
        Insert: {
          content: Json
          createdAt?: string
          difficulty: string
          id: string
          mode?: string
          subject: string
          toolType: string
          topicLabel: string
          updatedAt: string
          userId: string
        }
        Update: {
          content?: Json
          createdAt?: string
          difficulty?: string
          id?: string
          mode?: string
          subject?: string
          toolType?: string
          topicLabel?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "StudyContentCache_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      StudyPlan: {
        Row: {
          days: Json
          id: string
          updatedAt: string
          userId: string
          weekStart: string
        }
        Insert: {
          days: Json
          id: string
          updatedAt: string
          userId: string
          weekStart: string
        }
        Update: {
          days?: Json
          id?: string
          updatedAt?: string
          userId?: string
          weekStart?: string
        }
        Relationships: [
          {
            foreignKeyName: "StudyPlan_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      StudySession: {
        Row: {
          completed: boolean
          correct: number
          difficulty: string
          durationSec: number
          endedAt: string | null
          id: string
          startedAt: string
          subject: string
          topicId: string
          topicLabel: string
          total: number
          userId: string
          xpEarned: number
        }
        Insert: {
          completed?: boolean
          correct?: number
          difficulty: string
          durationSec?: number
          endedAt?: string | null
          id: string
          startedAt?: string
          subject: string
          topicId: string
          topicLabel: string
          total?: number
          userId: string
          xpEarned?: number
        }
        Update: {
          completed?: boolean
          correct?: number
          difficulty?: string
          durationSec?: number
          endedAt?: string | null
          id?: string
          startedAt?: string
          subject?: string
          topicId?: string
          topicLabel?: string
          total?: number
          userId?: string
          xpEarned?: number
        }
        Relationships: [
          {
            foreignKeyName: "StudySession_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      StudyToolEvent: {
        Row: {
          cardCount: number
          generatedAt: string
          id: string
          subject: string
          toolType: string
          topicId: string
          userId: string
        }
        Insert: {
          cardCount?: number
          generatedAt?: string
          id: string
          subject: string
          toolType: string
          topicId: string
          userId: string
        }
        Update: {
          cardCount?: number
          generatedAt?: string
          id?: string
          subject?: string
          toolType?: string
          topicId?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "StudyToolEvent_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      SubtopicProgress: {
        Row: {
          correct: number
          id: string
          lastPracticed: string | null
          subject: string
          subtopicLabel: string
          topicId: string
          total: number
          userId: string
          xp: number
        }
        Insert: {
          correct?: number
          id: string
          lastPracticed?: string | null
          subject: string
          subtopicLabel: string
          topicId: string
          total?: number
          userId: string
          xp?: number
        }
        Update: {
          correct?: number
          id?: string
          lastPracticed?: string | null
          subject?: string
          subtopicLabel?: string
          topicId?: string
          total?: number
          userId?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "SubtopicProgress_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      TopicProgress: {
        Row: {
          correct: number
          id: string
          lastPracticed: string | null
          subject: string
          topicId: string
          total: number
          userId: string
          xp: number
        }
        Insert: {
          correct?: number
          id: string
          lastPracticed?: string | null
          subject: string
          topicId: string
          total?: number
          userId: string
          xp?: number
        }
        Update: {
          correct?: number
          id?: string
          lastPracticed?: string | null
          subject?: string
          topicId?: string
          total?: number
          userId?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "TopicProgress_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      User: {
        Row: {
          agreedAt: string | null
          agreedToTerms: boolean
          avatarUrl: string | null
          createdAt: string
          deletedAt: string | null
          deletedBy: string | null
          email: string
          id: string
          name: string | null
          role: string
          suspended: boolean
          suspendedAt: string | null
          suspendedBy: string | null
          suspendReason: string | null
          updatedAt: string
        }
        Insert: {
          agreedAt?: string | null
          agreedToTerms?: boolean
          avatarUrl?: string | null
          createdAt?: string
          deletedAt?: string | null
          deletedBy?: string | null
          email: string
          id: string
          name?: string | null
          role?: string
          suspended?: boolean
          suspendedAt?: string | null
          suspendedBy?: string | null
          suspendReason?: string | null
          updatedAt: string
        }
        Update: {
          agreedAt?: string | null
          agreedToTerms?: boolean
          avatarUrl?: string | null
          createdAt?: string
          deletedAt?: string | null
          deletedBy?: string | null
          email?: string
          id?: string
          name?: string | null
          role?: string
          suspended?: boolean
          suspendedAt?: string | null
          suspendedBy?: string | null
          suspendReason?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      UserStats: {
        Row: {
          elaCorrect: number
          elaSessions: number
          elaTotal: number
          elaXP: number
          id: string
          mathCorrect: number
          mathSessions: number
          mathTotal: number
          mathXP: number
          totalSessions: number
          totalXP: number
          updatedAt: string
          userId: string
        }
        Insert: {
          elaCorrect?: number
          elaSessions?: number
          elaTotal?: number
          elaXP?: number
          id: string
          mathCorrect?: number
          mathSessions?: number
          mathTotal?: number
          mathXP?: number
          totalSessions?: number
          totalXP?: number
          updatedAt: string
          userId: string
        }
        Update: {
          elaCorrect?: number
          elaSessions?: number
          elaTotal?: number
          elaXP?: number
          id?: string
          mathCorrect?: number
          mathSessions?: number
          mathTotal?: number
          mathXP?: number
          totalSessions?: number
          totalXP?: number
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "UserStats_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      VocabWord: {
        Row: {
          active: boolean
          category: string | null
          createdAt: string
          definition: string
          difficulty: string
          example: string
          id: string
          partOfSpeech: string
          word: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          createdAt?: string
          definition: string
          difficulty?: string
          example: string
          id: string
          partOfSpeech: string
          word: string
        }
        Update: {
          active?: boolean
          category?: string | null
          createdAt?: string
          definition?: string
          difficulty?: string
          example?: string
          id?: string
          partOfSpeech?: string
          word?: string
        }
        Relationships: []
      }
      WordDeliveryLog: {
        Row: {
          id: string
          sentAt: string
          status: string
          userId: string
          wordIds: string[] | null
        }
        Insert: {
          id: string
          sentAt?: string
          status?: string
          userId: string
          wordIds?: string[] | null
        }
        Update: {
          id?: string
          sentAt?: string
          status?: string
          userId?: string
          wordIds?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "WordDeliveryLog_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      WordSubscription: {
        Row: {
          deliveryHour: number
          enabled: boolean
          id: string
          lastSentAt: string | null
          timezone: string
          userId: string
          wordIndex: number
        }
        Insert: {
          deliveryHour?: number
          enabled?: boolean
          id: string
          lastSentAt?: string | null
          timezone?: string
          userId: string
          wordIndex?: number
        }
        Update: {
          deliveryHour?: number
          enabled?: boolean
          id?: string
          lastSentAt?: string | null
          timezone?: string
          userId?: string
          wordIndex?: number
        }
        Relationships: [
          {
            foreignKeyName: "WordSubscription_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_hoa_form: {
        Args: { _hoa_id: string; _storage_path: string; _title: string }
        Returns: string
      }
      activate_hoa_guideline: {
        Args: {
          _extracted_text: string
          _hoa_id: string
          _storage_path: string
          _title: string
        }
        Returns: string
      }
      can_access_hoa: {
        Args: { _hoa_id: string; _user_id: string }
        Returns: boolean
      }
      claim_first_admin: { Args: never; Returns: undefined }
      finalize_arc_review: {
        Args: {
          _application_id: string
          _decision: Database["public"]["Enums"]["review_decision"]
          _homeowner_message: string
          _review_id: string
        }
        Returns: undefined
      }
      has_approved_membership: {
        Args: { _hoa_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_member: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "homeowner" | "reviewer" | "admin"
      application_status:
        | "submitted"
        | "in_review"
        | "approved"
        | "conditional"
        | "rejected"
        | "changes_requested"
      membership_status: "pending" | "approved" | "rejected"
      review_decision: "approved" | "conditional" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["homeowner", "reviewer", "admin"],
      application_status: [
        "submitted",
        "in_review",
        "approved",
        "conditional",
        "rejected",
        "changes_requested",
      ],
      membership_status: ["pending", "approved", "rejected"],
      review_decision: ["approved", "conditional", "rejected"],
    },
  },
} as const
