from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, TIMESTAMP, Date, UniqueConstraint, event
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from flask_login import UserMixin
from ..extensions import db

Base = db.Model


class ComPerson(Base):
    __tablename__ = 'com_persons'

    id = Column(Integer, primary_key=True, autoincrement=True)
    surname = Column(String(100))
    name = Column(String(100))
    patro = Column(String(100))
    gender = Column(Boolean, default=False)
    birthdate = Column(Date)
    snils = Column(String(11), unique=True)
    photo_file = Column(String(32), default='')
    photo_cache = Column(String(32), default='')
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(),
                        onupdate=func.current_timestamp())

    user = relationship("User", back_populates="person")
    emp_post = relationship("EmpPost", back_populates="person", uselist=False)
    profile_choices = relationship("ProfileChoice", back_populates="person")
    exam_results = relationship("ExamResult", back_populates="person")

    def __repr__(self):
        return f'<ComPerson {self.surname} {self.name}>'


class User(Base, UserMixin):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), unique=True)
    password = Column(String(255))
    pers_id = Column(Integer, ForeignKey('com_persons.id', ondelete='SET NULL'))
    is_alias = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(),
                        onupdate=func.current_timestamp())

    person = relationship("ComPerson", back_populates="user")

    def check_password(self, password):
        return self.password == password

    def is_admin(self):
        """Проверка прав администратора"""
        if not self.person or not self.person.emp_post or not self.person.emp_post.role:
            return False
        return self.person.emp_post.role.role == 'distribution'

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': 'admin' if self.is_admin() else 'student',
            'is_admin': self.is_admin()
        }


class EmpPost(Base):
    __tablename__ = 'emp_post'

    id = Column(Integer, primary_key=True, autoincrement=True)
    pers_id = Column(Integer, ForeignKey('com_persons.id', ondelete='SET NULL'))
    post = Column(String(200))
    bldgs = Column(String(200))
    rank = Column(Integer)

    person = relationship("ComPerson", back_populates="emp_post")
    role = relationship("EmpPostRoles", back_populates="emp_post", uselist=False)


class EmpPostRoles(Base):
    __tablename__ = 'emp_post_roles'

    id = Column(Integer, primary_key=True, autoincrement=True)
    post_id = Column(Integer, ForeignKey('emp_post.id', ondelete='SET NULL'))
    role = Column(String(20))

    emp_post = relationship("EmpPost", back_populates="role")


class ClassProfile(Base):
    __tablename__ = 'class_profiles'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)

    # 🔧 ИСПРАВЛЕНО: Явно указываем foreign_keys для каждого отношения
    first_choices = relationship(
        "ProfileChoice",
        foreign_keys="ProfileChoice.first_choice_id",
        back_populates="first_choice"
    )
    second_choices = relationship(
        "ProfileChoice",
        foreign_keys="ProfileChoice.second_choice_id",
        back_populates="second_choice"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name
        }


class SystemSetting(Base):
    __tablename__ = 'system_settings'

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(50), unique=True, nullable=False)
    value = Column(String(255), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(),
                        onupdate=func.current_timestamp())

    @classmethod
    def get_setting(cls, key, default=None):
        setting = cls.query.filter_by(key=key).first()
        return setting.value if setting else default

    @classmethod
    def set_setting(cls, key, value):
        setting = cls.query.filter_by(key=key).first()
        if setting:
            setting.value = value
        else:
            setting = cls(key=key, value=value)
            db.session.add(setting)
        db.session.commit()
        return setting

    def to_dict(self):
        return {
            'id': self.id,
            'key': self.key,
            'value': self.value
        }


class ProfileChoice(Base):
    __tablename__ = 'profile_choices'

    id = Column(Integer, primary_key=True, autoincrement=True)
    person_id = Column(Integer, ForeignKey('com_persons.id', ondelete='SET NULL'))
    first_choice_id = Column(Integer, ForeignKey('class_profiles.id', ondelete='SET NULL'))
    second_choice_id = Column(Integer, ForeignKey('class_profiles.id', ondelete='SET NULL'))

    # 🔧 ИСПРАВЛЕНО: Явно указываем foreign_keys для каждого отношения
    first_choice = relationship(
        "ClassProfile",
        foreign_keys=[first_choice_id],
        back_populates="first_choices"
    )
    second_choice = relationship(
        "ClassProfile",
        foreign_keys=[second_choice_id],
        back_populates="second_choices"
    )
    person = relationship("ComPerson", back_populates="profile_choices")

    # Ограничение: один человек - одна запись выбора
    __table_args__ = (
        UniqueConstraint('person_id', name='uq_person_profile_choice'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "person_id": self.person_id,
            "first_choice": self.first_choice.to_dict() if self.first_choice else None,
            "second_choice": self.second_choice.to_dict() if self.second_choice else None
        }


class Subject(Base):
    __tablename__ = 'subjects'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)  # unique=True теперь работает корректно
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    exam_results = relationship("ExamResult", back_populates="subject")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name
        }

    def __repr__(self):
        return f'<Subject {self.name}>'


# 🔧 Автоматически приводим name к lowercase перед сохранением
@event.listens_for(Subject, 'before_insert')
def receive_before_insert(mapper, connection, target):
    target.name = target.name.strip().lower()


@event.listens_for(Subject, 'before_update')
def receive_before_update(mapper, connection, target):
    target.name = target.name.strip().lower()


class ExamResult(Base):
    __tablename__ = 'exam_results'

    id = Column(Integer, primary_key=True, autoincrement=True)
    person_id = Column(Integer, ForeignKey('com_persons.id', ondelete='SET NULL'))
    subject_id = Column(Integer, ForeignKey('subjects.id', ondelete='SET NULL'))
    result = Column(Integer, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(),
                        onupdate=func.current_timestamp())

    subject = relationship("Subject", back_populates="exam_results")
    person = relationship("ComPerson", back_populates="exam_results")

    __table_args__ = (
        db.UniqueConstraint('person_id', 'subject_id', name='uq_person_subject'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'person_id': self.person_id,
            'subject_id': self.subject_id,
            'result': self.result
        }

    def __repr__(self):
        return f'<ExamResult person={self.person_id} subject={self.subject_id}>'